const Errors = {
  NOT_ENOUGH_RIGHTS: {
    notEnoughRights: 'Not enough rights',
  },
  CARD_NOT_FOUND: {
    cardNotFound: 'Card not found',
  },
};

module.exports = {
  inputs: {
    cardId: {
      type: 'string',
      regex: /^[0-9]+$/,
      required: true,
    },
    text: {
      type: 'string',
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

    if (boardMembership.role !== BoardMembership.Roles.EDITOR && !boardMembership.canComment) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    const values = {
      type: Action.Types.COMMENT_CARD,
      data: _.pick(inputs, ['text']),
    };

    const action = await sails.helpers.actions.createOne.with({
      project,
      board,
      list,
      values: {
        ...values,
        card,
        user: currentUser,
      },
      request: this.req,
    });

    // const cardMemberships = await sails.helpers.cardSubscriptions.getMany({
    //   cardId: card.id,
    // });

    // const membershipsToSendEmail = await Promise.all(
    //   cardMemberships
    //     .filter(({ userId }) => userId !== currentUser.id)
    //     .map(({ userId }) => sails.helpers.users.getOne(userId)),
    // );

    // await Promise.all(
    //   membershipsToSendEmail.map((membership) =>
    //     sails.helpers.mail.sendCardCommentAction.with({
    //       to: membership.email,
    //       name: membership.name,
    //       cardId: card.id,
    //       cardName: card.name,
    //       from: currentUser.name,
    //       comment: inputs.text,
    //     }),
    //   ),
    // );

    return {
      item: action,
    };
  },
};
