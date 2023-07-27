import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app/app.module';
import { LogService } from 'src/log/log.service';
import { AuthService } from 'src/auth/service/auth.service';
import { AccessTokenDto } from 'src/auth/dto/auth/access-token.dto';
import { UserService } from 'src/auth/service/user.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from 'src/auth/entity/user.entity';
import { signUp } from './test-utils';
import * as cookieParser from 'cookie-parser';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let repo: Repository<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      providers: [
        LogService,
        UserService,
        AuthService,
        {
          provide: getRepositoryToken(User),
          useClass: Repository<User>
        }
      ]
    }).compile();

    app = module.createNestApplication();
    app.use(cookieParser());
    repo = module.get<Repository<User>>(getRepositoryToken(User));
    await app.init();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await repo.query('DELETE FROM db_user');
    await app.close();
  });

  describe('POST /api/auth/signup', () => {
    it('should return CREATED status', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send({
          username: 'username',
          email: 'username@email.com',
          password: 'password'
        })
        .expect(HttpStatus.CREATED);
    });

    it('should return an AccessTokenDto', async () => {
      const accessTokenDto: AccessTokenDto = {
        accessToken: expect.any(String),
        expiresIn: expect.any(Number)
      };
      await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send({
          username: 'username',
          email: 'username@email.com',
          password: 'password'
        })
        .expect(({ body }) => {
          expect(body).toEqual(accessTokenDto);
        });
    });

    it('should place a refresh_token in cookies with correct attributes', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send({
          username: 'username',
          email: 'username@email.com',
          password: 'password'
        })
        .expect(({ headers }) => {
          const refreshTokenCookie = headers['set-cookie'].find(
            (cookie: string) => cookie.startsWith('refresh_token')
          );
          expect(refreshTokenCookie).toBeDefined();
          expect(refreshTokenCookie).toContain('HttpOnly');
          expect(refreshTokenCookie).toContain('Secure');
          expect(refreshTokenCookie).toContain('Path=/api/auth/refresh');
          expect(refreshTokenCookie).toContain('SameSite=Strict');
          expect(refreshTokenCookie).toContain('Expires');
        });
    });
  });

  describe('POST /api/auth/login', () => {
    it('should return OK status', async () => {
      const { username, password } = await signUp(app);

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ username, password })
        .expect(HttpStatus.OK);
    });

    it('should return UNAUTHORIZED status if username does not exist', async () => {
      const { username, password } = await signUp(app);

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ username: `${username}1`, password })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return UNAUTHORIZED status if password is invalid', async () => {
      const { username, password } = await signUp(app);

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ username, password: `${password}1` })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return an AccessTokenDto', async () => {
      const { username, password } = await signUp(app);

      const accessTokenDto: AccessTokenDto = {
        accessToken: expect.any(String),
        expiresIn: expect.any(Number)
      };
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ username, password })
        .expect(({ body }) => {
          expect(body).toEqual(accessTokenDto);
        });
    });

    it('should place a refresh_token in cookies with correct attributes', async () => {
      const { username, password } = await signUp(app);

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ username, password })
        .expect(({ headers }) => {
          const refreshTokenCookie = headers['set-cookie'].find(
            (cookie: string) => cookie.startsWith('refresh_token')
          );
          expect(refreshTokenCookie).toBeDefined();
          expect(refreshTokenCookie).toContain('HttpOnly');
          expect(refreshTokenCookie).toContain('Secure');
          expect(refreshTokenCookie).toContain('Path=/api/auth/refresh');
          expect(refreshTokenCookie).toContain('SameSite=Strict');
          expect(refreshTokenCookie).toContain('Expires');
        });
    });
  });

  describe('GET /api/auth/logout', () => {
    it('should return OK status', async () => {
      const { accessToken } = await signUp(app);

      await request(app.getHttpServer())
        .get('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.OK);
    });

    it('should nullify user hashedRefreshToken in the database', async () => {
      const { accessToken, id } = await signUp(app);

      await request(app.getHttpServer())
        .get('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      const { hashedRefreshToken } = await repo.findOneBy({ id });
      expect(hashedRefreshToken).toBeNull();
    });
  });

  describe('GET /api/auth/refresh', () => {
    it('should return OK status', async () => {
      const { cookies } = await signUp(app);

      await request(app.getHttpServer())
        .get('/api/auth/refresh')
        .set('Cookie', cookies)
        .expect(HttpStatus.OK);
    });

    it('should return an AccessTokenDto', async () => {
      const { cookies } = await signUp(app);

      const accessTokenDto: AccessTokenDto = {
        accessToken: expect.any(String),
        expiresIn: expect.any(Number)
      };
      await request(app.getHttpServer())
        .get('/api/auth/refresh')
        .set('Cookie', cookies)
        .expect(({ body }) => {
          expect(body).toEqual(accessTokenDto);
        });
    });

    it('should place a refresh_token in cookies with correct attributes', async () => {
      const { cookies } = await signUp(app);

      await request(app.getHttpServer())
        .get('/api/auth/refresh')
        .set('Cookie', cookies)
        .expect(({ headers }) => {
          const refreshTokenCookie = headers['set-cookie'].find(
            (cookie: string) => cookie.startsWith('refresh_token')
          );
          expect(refreshTokenCookie).toBeDefined();
          expect(refreshTokenCookie).toContain('HttpOnly');
          expect(refreshTokenCookie).toContain('Secure');
          expect(refreshTokenCookie).toContain('Path=/api/auth/refresh');
          expect(refreshTokenCookie).toContain('SameSite=Strict');
          expect(refreshTokenCookie).toContain('Expires');
        });
    });
  });
});