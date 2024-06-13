const valuesValidator = (value) => {
  if (!_.isPlainObject(value)) {
    return false;
  }

  if (!_.isPlainObject(value.user) && !_.isString(value.userId)) {
    return false;
  }

  if (!_.isPlainObject(value.action)) {
    return false;
  }

  return true;
};

// TODO: use templates (views) to build html
const buildAndSendEmail = async (board, card, action, actorUser, notifiableUser) => {
  let emailData;
  switch (action.type) {
    case Action.Types.MOVE_CARD:
      emailData = {
        subject: `Board ${board.name} - Card [${card.name}] foi movido`,
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
                <h1 class="header">Olá, ${notifiableUser.name}!</h1>
                  <div class="content">
                    <p><b>${actorUser.name}</b> moveu o card <b>${card.name}</b> da coluna <b>${action.data.fromList.name}</b> para coluna <b>${action.data.toList.name}</b></p>
                    <p>Para abrir o card, clique no botão abaixo:</p>
                    <a href="https://board.quanti.ca/cards/${card.id}" class="button">Acessar card</a>
                  </div>
                </div>
              </body>
            </html>`,
      };

      break;
    case Action.Types.COMMENT_CARD:
      emailData = {
        subject: `Board ${board.name} - Card [${card.name}] tem um novo comentário de ${actorUser.name}`,
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
                <h1 class="header">Olá, ${notifiableUser.name}!</h1>
                  <div class="content">
                    <p><b>${actorUser.name}</b> fez o seguinte comentário no card <b>${card.name}</b>:</p>
                    <p><i>${action.data.text}</i></p>
                    <br />
                    <p>Para abrir o card, clique no botão abaixo:</p>
                    <a href="https://board.quanti.ca/cards/${card.id}" class="button">Acessar card</a>
                  </div>
                </div>
              </body>
            </html>`,
      };

      break;
    default:
      return;
  }

  await sails.helpers.utils.sendEmail.with({
    ...emailData,
    to: notifiableUser.email,
  });
};

module.exports = {
  inputs: {
    values: {
      type: 'ref',
      custom: valuesValidator,
      required: true,
    },
    project: {
      type: 'ref',
      required: true,
    },
    board: {
      type: 'ref',
      required: true,
    },
    list: {
      type: 'ref',
      required: true,
    },
    card: {
      type: 'ref',
      required: true,
    },
    actorUser: {
      type: 'ref',
      required: true,
    },
  },

  async fn(inputs) {
    const { values } = inputs;

    if (values.user) {
      values.userId = values.user.id;
    }

    const notification = await Notification.create({
      ...values,
      actionId: values.action.id,
      cardId: values.action.cardId,
    }).fetch();

    sails.sockets.broadcast(`user:${notification.userId}`, 'notificationCreate', {
      item: notification,
    });

    if (sails.hooks.smtp.isActive()) {
      let notifiableUser;
      if (values.user) {
        notifiableUser = values.user;
      } else {
        notifiableUser = await sails.helpers.users.getOne(notification.userId);
      }

      buildAndSendEmail(inputs.board, inputs.card, values.action, inputs.actorUser, notifiableUser);
    }

    sails.helpers.utils.sendWebhooks.with({
      event: 'notificationCreate',
      data: {
        item: notification,
        included: {
          projects: [inputs.project],
          boards: [inputs.board],
          lists: [inputs.list],
          cards: [inputs.card],
          actions: [values.action],
        },
      },
      user: inputs.actorUser,
    });

    return notification;
  },
};
