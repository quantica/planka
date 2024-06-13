const Errors = {
  NOT_ENOUGH_RIGHTS: {
    notEnoughRights: 'Not enough rights',
  },
  CARD_NOT_FOUND: {
    cardNotFound: 'Card not found',
  },
  USER_NOT_FOUND: {
    userNotFound: 'User not found',
  },
  USER_ALREADY_CARD_MEMBER: {
    userAlreadyCardMember: 'User already card member',
  },
};

module.exports = {
  inputs: {
    cardId: {
      type: 'string',
      regex: /^[0-9]+$/,
      required: true,
    },
    userId: {
      type: 'string',
      regex: /^[0-9]+$/,
      required: true,
    },
  },

  exits: {
    notEnoughRights: {
      responseType: 'forbidden',
    },
    cardNotFound: {
      responseType: 'notFound',
    },
    userNotFound: {
      responseType: 'notFound',
    },
    userAlreadyCardMember: {
      responseType: 'conflict',
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    const { card, list, board, project } = await sails.helpers.cards
      .getProjectPath(inputs.cardId)
      .intercept('pathNotFound', () => Errors.CARD_NOT_FOUND);

    const boardMembership = await BoardMembership.findOne({
      boardId: board.id,
      userId: currentUser.id,
    });

    if (!boardMembership) {
      throw Errors.CARD_NOT_FOUND; // Forbidden
    }

    if (boardMembership.role !== BoardMembership.Roles.EDITOR) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    const isBoardMember = await sails.helpers.users.isBoardMember(inputs.userId, board.id);

    const user = await sails.helpers.users.getOne(inputs.userId);

    if (!isBoardMember) {
      throw Errors.USER_NOT_FOUND;
    }

    const cardMembership = await sails.helpers.cardMemberships.createOne
      .with({
        project,
        board,
        list,
        values: {
          card,
          user,
        },
        actorUser: currentUser,
        request: this.req,
      })
      .intercept('userAlreadyCardMember', () => Errors.USER_ALREADY_CARD_MEMBER);

    const emailData = {
      subject: `Você foi atribuido a um novo card`,
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
                .button { display: inline-block; padding: 10px 20px; background-color: #0092db; color: #fff; text-decoration: none; border-radius: 5px; }
            </style>
        </head>
        <body>
          <div class="container">
          <h1 class="header">Olá, ${user.name}!</h1>
            <div class="content">
              <p>Novo card atribuido a você.</p>
              <p>Board: <b>${board.name}</b></p>
              <p>Nome do card: <b>${card.name}</b></p>
              <p>Para abrir clique no botão abaixo:</p>
              <a href="https://kanban.quanti.ca/cards/${card.id}" class="button">Acessar novo card</a>
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
      item: cardMembership,
    };
  },
};
