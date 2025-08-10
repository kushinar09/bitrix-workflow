import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('webhook_log')
export class WebhookLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  event: string;

  @Column()
  leadId: number;

  @Column('text')
  payload: string;

  @CreateDateColumn()
  createdAt: Date;
}