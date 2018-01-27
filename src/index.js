const Boom = require('boom');
const SwaggerParser = require('swagger-parser');
const ReactDomServer = require('react-dom/server');
const SwaggerComponent = require('./components/SwaggerComponent');
const pkg = require('../package.json');

const register = async (server, {
  path: route = '/documentation.html',
  swaggerEndpoint = '/swagger.json',
  cache = { privacy: 'public', expiresIn: 60 * 60 * 1000 }, // one hour
  auth, // if undefined, inheriting auth settings from server.options.routes.auth
}) => {
  server.route({
    method: 'GET',
    path: route,
    options: auth === undefined ? { cache } : { cache, auth },
    handler: async (request, h) => {
      try {
        const parser = new SwaggerParser();
        const api = await parser.parse(`${server.info.uri}${swaggerEndpoint}`, {
          resolve: {
            file: false, // don't resolve local file references
            http: {
              timeout: 2000,
              withCredentials: true, // include auth credentials when resolving HTTP references
              headers: {
                authorization: request.headers.authorization, // forward
              },
            },
          },
        });
        const component = SwaggerComponent({ api });
        const html = ReactDomServer.renderToStaticMarkup(component);
        return h.response(html).type('text/html').charset('utf-8');
      } catch (error) {
        request.log(['error'], error);
        return Boom.badImplementation();
      }
    },
  });
};

module.exports = { register, pkg };
