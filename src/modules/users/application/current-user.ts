import type {
  InternalUserRole,
} from "../domain/internal-user-role.ts";

export type CurrentInternalUser = {
  id: string;
  username: string;
  displayName: string;
  role: InternalUserRole;
};