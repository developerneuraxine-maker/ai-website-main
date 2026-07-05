export const OWNER_EMAILS = ["socialsprouts1@gmail.com", "developerneuraxine@gmail.com"];
export const isOwner = (email: string) =>
  OWNER_EMAILS.some((e) => e.toLowerCase() === email.toLowerCase());
