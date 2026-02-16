import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JournalService } from './journal.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

class CreateEntryDto {
  date: string;
  title: string;
  description: string;
}

class UpdateEntryDto {
  date?: string;
  title?: string;
  description?: string;
}

@Controller('journal')
@UseGuards(JwtAuthGuard)
export class JournalController {
  constructor(private readonly journalService: JournalService) {}

  @Get()
  getEntries(@Req() req: Request) {
    const user = req.user as { userId: string };
    return this.journalService.getAllByUser(user.userId);
  }

  @Post()
  createEntry(@Req() req: Request, @Body() dto: CreateEntryDto) {
    const user = req.user as { userId: string };
    return this.journalService.create(user.userId, {
      date: dto.date,
      title: dto.title,
      description: dto.description,
    });
  }

  @Patch(':id')
  updateEntry(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEntryDto,
  ) {
    const user = req.user as { userId: string };
    const updated = this.journalService.update(user.userId, id, dto);
    if (!updated) throw new NotFoundException('Entry not found');
    return updated;
  }

  @Delete(':id')
  deleteEntry(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    const user = req.user as { userId: string };
    return { deleted: this.journalService.delete(user.userId, id) };
  }
}
