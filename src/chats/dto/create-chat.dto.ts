import { IsInt, IsPositive } from 'class-validator';

export class CreateChatDto {
  @IsInt()
  @IsPositive()
  participantId: number;
}
