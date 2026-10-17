import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Readable } from 'node:stream';
import request from 'supertest';
import { setupApp } from '../src/setup-app.js';
import { StorageService } from '../src/storage/storage.service.js';

// Smallest valid PNG, so the magic-byte file type check passes.
const PNG = Buffer.from(
  '89504e470d0a1a0a0000000d4948445200000001000000010806000000' +
    '1f15c4890000000d49444154789c63f8cfc0f01f0005000101ff89993d1d0000000049454e44ae426082',
  'hex',
);

class InMemoryStorage {
  objects = new Map<string, { body: Buffer; contentType: string }>();
  async put(key: string, body: Buffer, contentType: string) {
    this.objects.set(key, { body, contentType });
  }
  async get(key: string) {
    const o = this.objects.get(key)!;
    return { body: Readable.from(o.body), contentType: o.contentType, contentLength: o.body.length };
  }
  async delete(key: string) {
    this.objects.delete(key);
  }
}

describe('Events API (e2e)', () => {
  let mongo: MongoMemoryServer;
  let app: INestApplication;
  const storage = new InMemoryStorage();
  const tokens: Record<string, string> = {};
  const userIds: Record<string, string> = {};

  const http = () => request(app.getHttpServer());
  const as = (who: string) => ({ Authorization: `Bearer ${tokens[who]}` });

  const login = async (who: string, email: string) => {
    const res = await http().post('/api/auth/dev-login').send({ email, name: who }).expect(201);
    tokens[who] = res.body.accessToken;
    userIds[who] = res.body.user.id;
    return res.body.user;
  };

  const createEvent = (fields: Partial<Record<string, string>> = {}) => {
    const req = http().post('/api/events').set(as('admin'));
    const values = {
      name: 'Java Meetup',
      address: '1 Main St',
      description: 'Talks and pizza',
      startsAt: new Date(Date.now() + 86_400_000).toISOString(),
      capacity: '2',
      ...fields,
    };
    for (const [k, v] of Object.entries(values)) req.field(k, v);
    return req.attach('image', PNG, { filename: 'cover.png', contentType: 'image/png' });
  };

  const signUp = (who: string, eventId: string) =>
    http().post(`/api/events/${eventId}/registrations`).set(as(who));

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    Object.assign(process.env, {
      MONGO_URI: mongo.getUri('events-test'),
      JWT_SECRET: 'test-secret',
      ADMIN_EMAILS: 'admin@example.com',
      DEV_LOGIN_ENABLED: 'true',
      S3_BUCKET: 'test',
      GOOGLE_CLIENT_ID: '',
    });
    // Imported after env is set, since config is read when the module loads.
    const { AppModule } = await import('../src/app.module.js');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(StorageService)
      .useValue(storage)
      .compile();
    app = moduleRef.createNestApplication();
    setupApp(app, 'http://localhost:5173');
    await app.init();

    await login('admin', 'admin@example.com');
    for (const name of ['alice', 'bob', 'carol', 'dave']) await login(name, `${name}@example.com`);
  });

  afterAll(async () => {
    await app?.close();
    await mongo?.stop();
  });

  it('assigns ADMIN only to ADMIN_EMAILS', async () => {
    expect((await http().get('/api/users/me').set(as('admin'))).body.role).toBe('ADMIN');
    expect((await http().get('/api/users/me').set(as('alice'))).body.role).toBe('USER');
  });

  it('requires a token by default', async () => {
    await http().get('/api/events').expect(401);
  });

  it('only lets admins create events', async () => {
    await http().post('/api/events').set(as('alice')).field('name', 'x').expect(403);
  });

  it('requires name, address, description and image', async () => {
    const missingFields = await http()
      .post('/api/events')
      .set(as('admin'))
      .field('capacity', '1')
      .attach('image', PNG, { filename: 'a.png', contentType: 'image/png' })
      .expect(400);
    expect(missingFields.body.message).toEqual(
      expect.arrayContaining([
        expect.stringContaining('name'),
        expect.stringContaining('address'),
        expect.stringContaining('description'),
      ]),
    );

    const noImage = http().post('/api/events').set(as('admin'));
    for (const [k, v] of Object.entries({ name: 'a', address: 'b', description: 'c', startsAt: '2030-01-01T00:00:00Z', capacity: '1' }))
      noImage.field(k, v);
    await noImage.expect(400);
  });

  it('rejects non-image uploads by content, not just by declared type', async () => {
    await http()
      .post('/api/events')
      .set(as('admin'))
      .field('name', 'a').field('address', 'b').field('description', 'c')
      .field('startsAt', '2030-01-01T00:00:00Z').field('capacity', '1')
      .attach('image', Buffer.from('not an image'), { filename: 'x.png', contentType: 'image/png' })
      .expect(400);
  });

  it('stores and serves the uploaded image', async () => {
    const { body: event } = await createEvent().expect(201);
    const img = await http().get(event.imageUrl).expect(200);
    expect(img.headers['content-type']).toBe('image/png');
    expect(Buffer.compare(img.body, PNG)).toBe(0);
  });

  it('confirms up to capacity, then waitlists in order, then promotes on cancel', async () => {
    const { body: event } = await createEvent({ capacity: '2' }).expect(201);

    expect((await signUp('alice', event.id).expect(201)).body).toEqual({ status: 'CONFIRMED', waitlistPosition: null });
    expect((await signUp('bob', event.id).expect(201)).body.status).toBe('CONFIRMED');
    expect((await signUp('carol', event.id).expect(201)).body).toEqual({ status: 'WAITLISTED', waitlistPosition: 1 });
    expect((await signUp('dave', event.id).expect(201)).body).toEqual({ status: 'WAITLISTED', waitlistPosition: 2 });
    await signUp('alice', event.id).expect(409);

    let detail = (await http().get(`/api/events/${event.id}`).set(as('dave'))).body;
    expect(detail).toMatchObject({ confirmedCount: 2, waitlistCount: 2, myStatus: 'WAITLISTED', myWaitlistPosition: 2 });

    // A confirmed attendee leaves: head of the waitlist (carol) takes the seat.
    await http().delete(`/api/events/${event.id}/registrations/me`).set(as('alice')).expect(204);
    detail = (await http().get(`/api/events/${event.id}`).set(as('carol'))).body;
    expect(detail).toMatchObject({ confirmedCount: 2, waitlistCount: 1, myStatus: 'CONFIRMED' });
    detail = (await http().get(`/api/events/${event.id}`).set(as('dave'))).body;
    expect(detail.myWaitlistPosition).toBe(1);

    // A waitlisted user leaves: no seat changes hands.
    await http().delete(`/api/events/${event.id}/registrations/me`).set(as('dave')).expect(204);
    detail = (await http().get(`/api/events/${event.id}`).set(as('admin'))).body;
    expect(detail).toMatchObject({ confirmedCount: 2, waitlistCount: 0 });

    // A confirmed attendee leaves with nobody waiting: seat is released.
    await http().delete(`/api/events/${event.id}/registrations/me`).set(as('bob')).expect(204);
    detail = (await http().get(`/api/events/${event.id}`).set(as('admin'))).body;
    expect(detail.confirmedCount).toBe(1);

    await http().delete(`/api/events/${event.id}/registrations/me`).set(as('bob')).expect(404);
  });

  it('never overbooks under concurrent sign-ups', async () => {
    const { body: event } = await createEvent({ capacity: '1' }).expect(201);
    const results = await Promise.all(['alice', 'bob', 'carol', 'dave'].map((u) => signUp(u, event.id)));
    const statuses = results.map((r) => r.body.status).sort();
    expect(statuses).toEqual(['CONFIRMED', 'WAITLISTED', 'WAITLISTED', 'WAITLISTED']);
    const detail = (await http().get(`/api/events/${event.id}`).set(as('admin'))).body;
    expect(detail).toMatchObject({ confirmedCount: 1, waitlistCount: 3 });
  });

  it('shows attendees only to admins and registered users (including waitlisted)', async () => {
    const { body: event } = await createEvent({ capacity: '1' }).expect(201);
    await signUp('alice', event.id).expect(201);
    await signUp('bob', event.id).expect(201); // waitlisted

    await http().get(`/api/events/${event.id}/attendees`).set(as('carol')).expect(403);

    const forBob = (await http().get(`/api/events/${event.id}/attendees`).set(as('bob')).expect(200)).body;
    expect(forBob.confirmed.map((a: { name: string }) => a.name)).toEqual(['alice']);
    expect(forBob.waitlist.map((a: { name: string }) => a.name)).toEqual(['bob']);
    expect(forBob.confirmed[0].email).toBeUndefined();

    const forAdmin = (await http().get(`/api/events/${event.id}/attendees`).set(as('admin')).expect(200)).body;
    expect(forAdmin.confirmed[0].email).toBe('alice@example.com');
  });

  it('promotes the waitlist when capacity grows, and refuses to shrink below confirmed', async () => {
    const { body: event } = await createEvent({ capacity: '1' }).expect(201);
    for (const u of ['alice', 'bob', 'carol']) await signUp(u, event.id).expect(201);

    await http().patch(`/api/events/${event.id}`).set(as('admin')).field('capacity', '0').expect(400);

    const grown = (await http().patch(`/api/events/${event.id}`).set(as('admin')).field('capacity', '2').expect(200)).body;
    expect(grown).toMatchObject({ capacity: 2, confirmedCount: 2, waitlistCount: 1 });

    await http().patch(`/api/events/${event.id}`).set(as('admin')).field('capacity', '1').expect(400);
  });

  it('lets admins kick attendees, handing their seat to the waitlist', async () => {
    const { body: event } = await createEvent({ capacity: '1' }).expect(201);
    await signUp('alice', event.id).expect(201);
    await signUp('bob', event.id).expect(201); // waitlisted
    const kick = (who: string) => http().delete(`/api/events/${event.id}/registrations/${userIds[who]}`);

    await kick('alice').set(as('bob')).expect(403);
    await kick('alice').set(as('admin')).expect(204);

    let detail = (await http().get(`/api/events/${event.id}`).set(as('bob'))).body;
    expect(detail).toMatchObject({ confirmedCount: 1, waitlistCount: 0, myStatus: 'CONFIRMED' });
    detail = (await http().get(`/api/events/${event.id}`).set(as('alice'))).body;
    expect(detail.myStatus).toBeNull();

    await kick('alice').set(as('admin')).expect(404);
    await http().delete(`/api/events/${event.id}/registrations/not-an-id`).set(as('admin')).expect(400);
  });

  describe('metrics', () => {
    const markUrl = (eventId: string, metric: string, who: string) =>
      `/api/events/${eventId}/metrics/${metric}/users/${userIds[who]}`;

    it('stores metric definitions on the event, deduped by key', async () => {
      const { body: event } = await createEvent({ metrics: JSON.stringify(['No-show', 'no show', ' Tardiness ']) }).expect(201);
      expect(event.metrics).toEqual([
        { key: 'no-show', label: 'No-show' },
        { key: 'tardiness', label: 'Tardiness' },
      ]);
      expect((await createEvent().expect(201)).body.metrics).toEqual([]);
      await createEvent({ metrics: 'not json' }).expect(400);
    });

    it('lets admins mark confirmed attendees and shows marks only to admins', async () => {
      const { body: event } = await createEvent({ capacity: '1', metrics: '["No-show","Late payment"]' }).expect(201);
      await signUp('alice', event.id).expect(201);
      await signUp('bob', event.id).expect(201); // waitlisted

      await http().put(markUrl(event.id, 'no-show', 'alice')).set(as('bob')).expect(403);
      await http().put(markUrl(event.id, 'no-show', 'alice')).set(as('admin')).expect(204);
      await http().put(markUrl(event.id, 'no-show', 'alice')).set(as('admin')).expect(204); // idempotent
      await http().put(markUrl(event.id, 'tardiness', 'alice')).set(as('admin')).expect(404);
      await http().put(markUrl(event.id, 'no-show', 'bob')).set(as('admin')).expect(400);

      const forAdmin = (await http().get(`/api/events/${event.id}/attendees`).set(as('admin'))).body;
      expect(forAdmin.confirmed[0].metrics).toEqual(['no-show']);
      expect(forAdmin.waitlist[0].metrics).toEqual([]);
      const forAlice = (await http().get(`/api/events/${event.id}/attendees`).set(as('alice'))).body;
      expect(forAlice.confirmed[0].metrics).toBeUndefined();

      await http().delete(markUrl(event.id, 'no-show', 'alice')).set(as('admin')).expect(204);
      const after = (await http().get(`/api/events/${event.id}/attendees`).set(as('admin'))).body;
      expect(after.confirmed[0].metrics).toEqual([]);
    });

    it('drops marks of a metric removed from the event', async () => {
      const { body: event } = await createEvent({ metrics: '["No-show","Tardiness"]' }).expect(201);
      await signUp('alice', event.id).expect(201);
      await http().put(markUrl(event.id, 'no-show', 'alice')).set(as('admin')).expect(204);
      await http().put(markUrl(event.id, 'tardiness', 'alice')).set(as('admin')).expect(204);

      await http().patch(`/api/events/${event.id}`).set(as('admin')).field('metrics', '["Tardiness"]').expect(200);
      const list = (await http().get(`/api/events/${event.id}/attendees`).set(as('admin'))).body;
      expect(list.confirmed[0].metrics).toEqual(['tardiness']);
    });

    it('reports per-user and per-event rates over started events', async () => {
      // Sign up while upcoming, then move the event into the past.
      const make = async (people: string[]) => {
        const { body: event } = await createEvent({ capacity: '5', metrics: '["Report no-show"]' }).expect(201);
        for (const p of people) await signUp(p, event.id).expect(201);
        await http().patch(`/api/events/${event.id}`).set(as('admin'))
          .field('startsAt', new Date(Date.now() - 3_600_000).toISOString()).expect(200);
        return event.id as string;
      };
      const first = await make(['alice', 'bob']);
      const second = await make(['alice', 'carol']);
      await http().put(markUrl(first, 'report-no-show', 'alice')).set(as('admin')).expect(204);
      await http().put(markUrl(second, 'report-no-show', 'alice')).set(as('admin')).expect(204);
      // A kicked no-show keeps their record.
      await http().put(markUrl(second, 'report-no-show', 'carol')).set(as('admin')).expect(204);
      await http().delete(`/api/events/${second}/registrations/${userIds.carol}`).set(as('admin')).expect(204);

      await http().get('/api/metrics/report').set(as('alice')).expect(403);
      const report = (await http().get('/api/metrics/report').set(as('admin')).expect(200)).body;
      expect(report.metrics).toContainEqual({ key: 'report-no-show', label: 'Report no-show' });
      const stat = (who: string) =>
        report.users.find((u: { userId: string }) => u.userId === userIds[who]).stats['report-no-show'];
      expect(stat('alice')).toEqual({ count: 2, opportunities: 2 });
      expect(stat('bob')).toEqual({ count: 0, opportunities: 1 });
      expect(stat('carol')).toEqual({ count: 1, opportunities: 1 });
      const row = report.events.find((e: { eventId: string }) => e.eventId === second);
      expect(row.stats['report-no-show']).toEqual({ count: 2, opportunities: 2 });
    });
  });

  it('rejects sign-ups for events that already started', async () => {
    const { body: event } = await createEvent({ startsAt: new Date(Date.now() - 60_000).toISOString() }).expect(201);
    await signUp('alice', event.id).expect(400);
  });

  it('lists upcoming events by default with the caller status', async () => {
    const { body: event } = await createEvent({ name: 'Listed' }).expect(201);
    await signUp('alice', event.id).expect(201);
    const list = (await http().get('/api/events').set(as('alice')).expect(200)).body;
    expect(list.find((e: { id: string }) => e.id === event.id).myStatus).toBe('CONFIRMED');
    const past = (await http().get('/api/events?scope=past').set(as('alice')).expect(200)).body;
    expect(past.find((e: { id: string }) => e.id === event.id)).toBeUndefined();
  });

  it('deletes an event with its registrations and image', async () => {
    const { body: event } = await createEvent().expect(201);
    await signUp('alice', event.id).expect(201);
    const before = storage.objects.size;
    await http().delete(`/api/events/${event.id}`).set(as('alice')).expect(403);
    await http().delete(`/api/events/${event.id}`).set(as('admin')).expect(204);
    await http().get(`/api/events/${event.id}`).set(as('admin')).expect(404);
    expect(storage.objects.size).toBe(before - 1);
  });

  it('returns 400 for malformed ids', async () => {
    await http().get('/api/events/not-an-id').set(as('alice')).expect(400);
  });
});
