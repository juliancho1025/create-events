export enum Role {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

/** What the JWT strategy puts on `req.user` for every authenticated request. */
export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}
