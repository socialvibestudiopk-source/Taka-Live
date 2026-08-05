module.exports = {
  //port
  PORT: process.env.PORT || 5000,

  //secret key for API
  SECRET_KEY: process.env.SECRET_KEY || "",

  //gmail credentials for send email
  EMAIL: process.env.EMAIL || "",
  PASSWORD: process.env.PASSWORD || "",

  //secret key for jwt
  JWT_SECRET: process.env.JWT_SECRET || "",

  SERVER_PATH: process.env.SERVER_PATH || "",

  // firebase server key for notification
  SERVER_KEY: process.env.SERVER_KEY || "",
};
