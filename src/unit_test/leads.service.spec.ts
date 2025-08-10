import { Test, TestingModule } from '@nestjs/testing';
import { LeadsService } from './../services/lead.service';

describe('LeadsService Round Robin', () => {
  let service: LeadsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: LeadsService,
          useValue: {
            getNextResponsibleId: jest
              .fn()
              .mockResolvedValueOnce(1)
              .mockResolvedValueOnce(2)
              .mockResolvedValueOnce(3)
              .mockResolvedValueOnce(1),
          },
        },
      ],
    }).compile();

    service = module.get<LeadsService>(LeadsService);
  });

  it('should assign users in round-robin order', async () => {
    const ids = [
      await service.getNextResponsibleId(),
      await service.getNextResponsibleId(),
      await service.getNextResponsibleId(),
      await service.getNextResponsibleId(),
    ];
    expect(ids).toEqual([1, 2, 3, 1]);
  });
});
