# Lightseeker - A supercharged search engine API for LBRY.

![GitHub License](https://img.shields.io/github/license/LBRYFoundation/lightseeker)

Lightseeker consists of 4 different components, that together offer a supercharged search of publications on the LBRY network.

* `MeiliSearch` - as the database backend.
* `Sync` - a service that syncs claims in the MeiliSearch database.
* `Purge` - a service that removes any blocked/filtered content from the database.
* `Lightseeker` - a search API server, which is a drop-in replacement for Lighthouse.

## Roadmap
* Use HUB servers for Sync instead of Chainquery.

## Usage
* To make a simple search by string:
    ```
    https://{LIGHTSEEKER_INSTANCE}/search?s={STRING_TO_SEARCH}
    ```

* To get autocomplete suggestions:
    ```
    https://{LIGHTSEEKER_INSTANCE}/autocomplete?s={STRING_TO_COMPLETE}
    ```

## Installation

### Prerequisites
* [Node](https://nodejs.org/en/download/)
* [MeiliSearch](https://www.meilisearch.com/)

After you've made sure all of that is set up, you are almost all set!
You are now just three simple steps away from a working Lightseeker instance.

> Clone the repo
```bash
git clone https://github.com/LBRYFoundation/lightseeker.git
```

> Install dependencies
```bash
npm install
```

> Start Lightseeker
```bash
npm run start
```

That's it! Now it should be live at http://localhost:3000, or whatever the `PORT` environment variable is set to.

## Contributing
Contributions to this project are welcome and encouraged. For more details, see https://lbry.tech/contribute.

## Licence
This project is MIT licensed. For the full license, see [LICENSE](/LICENSE).