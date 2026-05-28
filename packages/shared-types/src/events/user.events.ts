export interface UserRegisteredEvent {
  userId: string;
  email: string;
  firstName: string;
  correlationId?: string;
}
