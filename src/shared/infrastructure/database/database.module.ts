import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGO_URI'),
        // Fail within ~20s when MongoDB is down (e.g. Docker not started)
        // instead of the driver default of 30s per attempt, while still
        // tolerating a database that is a few seconds slow to boot.
        serverSelectionTimeoutMS: 5_000,
        retryAttempts: 3,
        retryDelay: 1_000,
      }),
    }),
  ],
})
export class DatabaseModule {}
