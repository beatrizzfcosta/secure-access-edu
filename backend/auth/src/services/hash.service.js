
//ARGON2

const argon2 = require('argon2');

async function hashPassword(password) {
  return await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16, //dificulta ataques
    timeCost: 3, //equilíbrio entre segurança e performance
    parallelism: 1
  });
}

async function verifyPassword(password, hashedPassword) {
  return await argon2.verify(hashedPassword, password);
}

module.exports = {
  hashPassword,
  verifyPassword
};