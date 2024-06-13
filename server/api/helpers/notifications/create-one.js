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
        subject: `${actorUser.name} moveu ${card.name} de ${action.data.fromList.name} para ${action.data.toList.name} no board ${board.name}`,
        html:
          `<p>${actorUser.name} moveu ` +
          `<a href="${process.env.BASE_URL}/cards/${card.id}">${card.name}</a> ` +
          `de ${action.data.fromList.name} para ${action.data.toList.name} ` +
          `no <a href="${process.env.BASE_URL}/boards/${board.id}">board ${board.name}</a></p>`,
      };

      break;
    case Action.Types.COMMENT_CARD:
      emailData = {
        subject: `${actorUser.name} left a new comment to ${card.name} on ${board.name}`,
        html:
          `<p>${actorUser.name} left a new comment to ` +
          `<a href="${process.env.BASE_URL}/cards/${card.id}">${card.name}</a> ` +
          `on <a href="${process.env.BASE_URL}/boards/${board.id}">${board.name}</a></p>` +
          `<p>${action.data.text}</p>`,
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
