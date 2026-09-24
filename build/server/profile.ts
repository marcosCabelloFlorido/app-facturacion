import type { FastifyInstance } from 'fastify';
import { profileSchema } from '../shared/profile.ts';
import { assert, audit, transaction } from './db.ts';

export function profileRoutes(api: FastifyInstance) {
  api.put('/profile', async (req) => {
    const body = profileSchema.parse(req.body);
    if (body.avatar) {
      const match = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/.exec(body.avatar);
      assert(match, 'La foto debe ser PNG o JPEG.', 400);
      const bytes = Buffer.from(match![2], 'base64');
      assert(bytes.length > 0 && bytes.length <= 256 * 1024, 'La foto supera 256 KB.', 400);
      const valid =
        match![1] === 'png'
          ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
      assert(valid, 'El contenido de la foto no es válido.', 400);
    }
    return transaction(async (client) => {
      const result = await client.query(
        'UPDATE public.users SET name=$2,avatar=$3,surname=COALESCE($4,surname),second_surname=COALESCE($5,second_surname) WHERE id=$1 RETURNING id,name,surname,second_surname AS "secondSurname",email,avatar',
        [req.user!.id, body.name, body.avatar, body.surname ?? null, body.secondSurname ?? null],
      );
      await audit(client, req.user!.id, req.user!.id, 'Perfil actualizado');
      return { ...result.rows[0], role: req.user!.role };
    });
  });
}
