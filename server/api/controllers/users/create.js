const zxcvbn = require('zxcvbn');

const Errors = {
  NOT_ENOUGH_RIGHTS: {
    notEnoughRights: 'Not enough rights',
  },
  EMAIL_ALREADY_IN_USE: {
    emailAlreadyInUse: 'Email already in use',
  },
  USERNAME_ALREADY_IN_USE: {
    usernameAlreadyInUse: 'Username already in use',
  },
};

const passwordValidator = (value) => zxcvbn(value).score >= 2; // TODO: move to config

module.exports = {
  inputs: {
    email: {
      type: 'string',
      isEmail: true,
      required: true,
    },
    password: {
      type: 'string',
      custom: passwordValidator,
      required: true,
    },
    name: {
      type: 'string',
      required: true,
    },
    username: {
      type: 'string',
      isNotEmptyString: true,
      minLength: 3,
      maxLength: 16,
      regex: /^[a-zA-Z0-9]+((_|\.)?[a-zA-Z0-9])*$/,
      allowNull: true,
    },
    phone: {
      type: 'string',
      isNotEmptyString: true,
      allowNull: true,
    },
    organization: {
      type: 'string',
      isNotEmptyString: true,
      allowNull: true,
    },
    language: {
      type: 'string',
      isNotEmptyString: true,
      allowNull: true,
    },
    subscribeToOwnCards: {
      type: 'boolean',
    },
  },

  exits: {
    notEnoughRights: {
      responseType: 'forbidden',
    },
    emailAlreadyInUse: {
      responseType: 'conflict',
    },
    usernameAlreadyInUse: {
      responseType: 'conflict',
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    if (sails.config.custom.oidcEnforced) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    const values = _.pick(inputs, [
      'email',
      'password',
      'name',
      'username',
      'phone',
      'organization',
      'language',
      'subscribeToOwnCards',
    ]);

    const user = await sails.helpers.users.createOne
      .with({
        values,
        actorUser: currentUser,
        request: this.req,
      })
      .intercept('emailAlreadyInUse', () => Errors.EMAIL_ALREADY_IN_USE)
      .intercept('usernameAlreadyInUse', () => Errors.USERNAME_ALREADY_IN_USE);

    const emailData = {
      subject: `Bem vindo ao Board da Quantica`,
      html: `
      <!DOCTYPE html>
      <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; }
                .container { max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; text-align: center}
                p {text-align: left}
                .header { color: #333; text-align: center; }
                .content { margin-top: 20px; }
                .ii a[href] {color: #fff;}
                .logo {width: 100px}
                .button { display: inline-block; padding: 10px 20px; background-color: #0092db; color: #fff !important; text-decoration: none; border-radius: 5px; }
                a:link { color: #fff !important; }
            </style>
        </head>
        <body>
          <div class="container">
          <h1 class="header">Bem-Vindo(a) ${values.name}!</h1>
            <div class="content">
              <p>Sua conta foi criada com sucesso.</p>
              <p>Seu login: <b>${values.email}</b></p>
              <p>Sua senha: <b>${values.password}</b></p>
              <p>Para começar, clique no botão abaixo:</p>
              <br />
              <a href="https://board.quanti.ca" class="button">Acessar Minha Conta</a>
            </div>
          </div>
        </body>
      </html>
      `,
    };

    await sails.helpers.utils.sendEmail.with({
      ...emailData,
      to: values.email,
    });

    return {
      item: user,
    };
  },
};
