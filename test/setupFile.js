'use strict';

jest.mock('clay-log');
jest.mock('handlebars', () => ({
  create: () => ({
    registerHelper: () => {},
    registerPartial: () => {}
  })
}));
