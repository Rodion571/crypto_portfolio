import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getHealth() {
    return { status: 'OK', message: 'Crypto Portfolio API is working' };
  }
}