import { NestModule, MiddlewareConsumer } from '@nestjs/common';
export declare class AppModule implements NestModule {
    private readonly logger;
    configure(consumer: MiddlewareConsumer): void;
}
