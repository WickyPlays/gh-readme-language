# Github Readme Language

## What is this?

Welcome to Github Readme Language (aka GH-Readme-Language).

This small project allows you to dynamically grab all languages that you have contributed on your or others' Github on README!

Originally this was only meant for my own portfolio README or website, but you guys can now experience it too!

> [!IMPORTANT]
> I am a solo developer for this project, therefore not every features could be covered just yet given the time that I have for other stuffs. However, you can contribute to the project! Read Contribution section for info.

## How to use

Simple. Simply add the following into your README.md (replace username with your Github username) and you're good to go!

```
![My stats](https://gh-readme-language.vercel.app/api/username)
```

This would be the result:

<p align="center">
  <img src="https://gh-readme-language.vercel.app/api/WickyPlays" alt="Top Languages" />
</p>

> [!CAUTION]
> Public API like the above has a disadvantage of being rate limited. Check [Build your own](#build-your-own) for more info.

## Contribution

Due to its open source nature, anyone is allowed to make a pull request (PR) to further improve the project.
The project is powered by Vercel.

### How to contribute
1. Clone this project by using `git clone https://github.com/WickyPlays/gh-readme-language.git`
2. Install node_modules: `npm install`
3. Run the development mode: `npm run dev`
4. After modify anywhere in the code that needs improved, submit a PR for me to review them.
5. You're done!

<a name="build-your-own" />
## Build your own
At any point if you are using public API provided by me, you'll possibily reach a rate limit error. This is because Github REST API only allows a total of 5000 calls/hour. Even though the API has its own rate limit protection, it's still not enough. We recommend you to build your own backend instance instead.

Some info:
+ The project is running under node.js
+ Github API key is needed to run. Create `.env` file with `GITHUB_TOKEN` environment variable.

## Support me

 <a href="https://ko-fi.com/wicky">
    <img src="https://cdn.ko-fi.com/cdn/kofi3.png?v=3" height="50" width="210" alt="Ko-fi" />
  </a>

## A thank you to the following

- [Express.js](https://expressjs.com/)
- ...and all the contributors and supporters who helped the project.

## License

This project is licensed under MIT.
