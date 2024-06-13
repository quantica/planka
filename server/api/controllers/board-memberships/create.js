const Errors = {
  BOARD_NOT_FOUND: {
    boardNotFound: 'Board not found',
  },
  USER_NOT_FOUND: {
    userNotFound: 'User not found',
  },
  USER_ALREADY_BOARD_MEMBER: {
    userAlreadyBoardMember: 'User already board member',
  },
};

module.exports = {
  inputs: {
    boardId: {
      type: 'string',
      regex: /^[0-9]+$/,
      required: true,
    },
    userId: {
      type: 'string',
      regex: /^[0-9]+$/,
      required: true,
    },
    role: {
      type: 'string',
      isIn: Object.values(BoardMembership.Roles),
      required: true,
    },
    canComment: {
      type: 'boolean',
      allowNull: true,
    },
  },

  exits: {
    boardNotFound: {
      responseType: 'notFound',
    },
    userNotFound: {
      responseType: 'notFound',
    },
    userAlreadyBoardMember: {
      responseType: 'conflict',
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    const { board, project } = await sails.helpers.boards
      .getProjectPath(inputs.boardId)
      .intercept('pathNotFound', () => Errors.BOARD_NOT_FOUND);

    const isProjectManager = await sails.helpers.users.isProjectManager(currentUser.id, project.id);

    if (!isProjectManager) {
      throw Errors.BOARD_NOT_FOUND; // Forbidden
    }

    const user = await sails.helpers.users.getOne(inputs.userId);

    if (!user) {
      throw Error.USER_NOT_FOUND;
    }

    const values = _.pick(inputs, ['role', 'canComment']);

    const boardMembership = await sails.helpers.boardMemberships.createOne
      .with({
        project,
        values: {
          ...values,
          board,
          user,
        },
        actorUser: currentUser,
        request: this.req,
      })
      .intercept('userAlreadyBoardMember', () => Errors.USER_ALREADY_BOARD_MEMBER);

    const emailData = {
      subject: `Você foi convidado para o board: ${board.name}`,
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
                a:link { color: #fff; }
            </style>
        </head>
        <body>
          <div class="container">
          <h1 class="header">Olá, ${user.name}!</h1>
            <div class="content">
              <p>Você foi convidado paara o board <b>${board.name}</b>.</p>
              <p>Para acessar o board, clique no botão abaixo:</p>
              <a href="https://board.quanti.ca/boards/${board.id}" class="button">Acessar novo board</a>
            </div>
          </div>
        </body>
      </html>
      `,
    };

    await sails.helpers.utils.sendEmail.with({
      ...emailData,
      to: user.email,
    });

    return {
      item: boardMembership,
    };
  },
};
