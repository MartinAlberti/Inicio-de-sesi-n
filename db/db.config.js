const envConfig = require('../config');

module.exports = {
    mongodb: {
        uri: `mongodb+srv://Martin:${envConfig.DB_PASSWORD}@coderhouse.y8qvc3g.mongodb.net/?retryWrites=true&w=majority`


    }
}