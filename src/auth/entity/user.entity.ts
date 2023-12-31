import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { Base } from 'src/shared/entity/base.entity';
import { IsEmail, IsNotEmpty } from 'class-validator';
import { Exclude } from 'class-transformer';

/**
 * Represents an application user
 */
@Entity()
export class User extends Base {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @IsNotEmpty()
  @Column({ unique: true })
  username: string;

  @IsEmail()
  @Column()
  email: string;

  @Exclude()
  @IsNotEmpty()
  @Column()
  hashedPassword: string;

  @Exclude()
  @Column({ nullable: true })
  hashedRefreshToken?: string;
}
