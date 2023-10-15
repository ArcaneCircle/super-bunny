# Super Bunny Strikes Back

Take Kitty on a quest to find Bunny lost!
Journey through dark forests and snowy meadows,
pass through a great waterfall to finally reach the steppes and confront the Lion King!
Clear the game to unlock Super Bunny and then hop with him at increased difficulty!

![Logo](./icon.png)

## Credits

This is a Webxdc port of the [Super Bunny Strikes Back](https://github.com/foumart/JS.13kGames.2019_SuperBunny) game.
The game has no music originally and was
enhanced by the incredible sound engine [ZzFXM](https://github.com/keithclark/ZzFXM).

## Contributing

### Installing Dependencies

After cloning this repo, install dependencies:

```
pnpm i
```

### Testing the app in the browser

To test your work in your browser (with hot reloading!) while developing:

```
pnpm dev-mini
# Alternatively to test in a more advanced Webxdc emulator:
pnpm dev
```

### Building

To package the Webxdc file:

```
pnpm build
```

To package the Webxdc with developer tools inside to debug in Delta Chat, set the `NODE_ENV`
environment variable to "debug":

```
NODE_ENV=debug pnpm build
```

The resulting optimized `.xdc` file is saved in `dist-xdc/` folder.

### Releasing

To automatically build and create a new GitHub release with the `.xdc` file:

```
git tag v1.0.1
git push origin v1.0.1
```
