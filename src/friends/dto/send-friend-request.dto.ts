import { IsInt, IsPositive } from 'class-validator';

export class SendFriendRequestDto {
  @IsInt()
  @IsPositive()
  receiverId: number;
}
