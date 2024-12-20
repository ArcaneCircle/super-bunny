import SongWorker from "./worker.js?worker";

const game = document.getElementById("game");
const gridCanvas = document.getElementById("gridCanvas");
const bunnyCanvas = document.getElementById("bunnyCanvas");
const leftbtn = document.getElementById("leftBtn");
const rightbtn = document.getElementById("rightBtn");
const menu = document.getElementById("menu");
document.getElementById("fullscreenBtn").onclick = toggleFullscreen;
document.getElementById("soundsBtn").onclick = mute;

let songNode = null;
let songStarted = false;
const worker = new SongWorker();
worker.onmessage = ({ data }) => {
  songNode = zzfxP(data.right, data.left); // prepare song for playing, but do not start
  songNode.loop = true;
  worker.terminate();
};

function startSong() {
  if (!songStarted) {
    if (!songNode) {
      setTimeout(startSong, 610);
    } else {
      songStarted = true;
      songNode.start();
    }
  }
}

function addLeadingZeros(num, size) {
  const s = "000000000" + num;
  return s.substring(s.length - size);
}

const selfNameShort = webxdc.selfName.split("@")[0].split(" ")[0];
var selfHighscore = 0;
var allHighscore = 0;
var allHighscoreName = "";
webxdc.setUpdateListener((update) => {
  if (
    update.payload.addr == webxdc.selfAddr &&
    update.payload.score > selfHighscore
  ) {
    selfHighscore = update.payload.score;
  }
  if (update.payload.score > allHighscore) {
    allHighscore = update.payload.score;
    allHighscoreName = update.payload.name;
  }
}, 0);

// requestAnimationFrame polyfill
/*if (!window.requestAnimationFrame) {
  window.requestAnimationFrame = ( function() {
    return window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    function(callback, element) {
      window.setTimeout(callback, 1000/60);
    };
  })();
}*/

// SoundFX, sound effects
var FX = (function () {
  var audioContext;
  var oscTypes = ["sawtooth", "square", "triangle", "sine"];
  var initialized;
  // start frequency HZ
  // frequency change in time + / -
  // length (number of frames taking to play the sound)
  // oscillator type 0 - 3
  // starting delay (frames of silence delay before the sound starts)
  // volume 0.0 - 1.0
  function playSound(_freq, _incr, _length, _type, _delay, _vol) {
    if (!audioContext) return; // doh, are we on IE??

    var oscillator = audioContext.createOscillator(); // instantiate a new oscillator
    oscillator.type = oscTypes[_type];

    var modulationGain = audioContext.createGain(); // instantiate modulation for sound volume control
    modulationGain.gain.value = 0; // set the initial volume to 0 to prevent an ugly tick noise at the beginning

    var i = 0; // frame counter
    if (_delay) setTimeout(playTune, _delay);
    else playTune();

    function playTune() {
      if (!_vol) return;
      if (!i) {
        oscillator.connect(modulationGain).connect(audioContext.destination);
        oscillator.start();
        // make sure to stop the sound from playing in the background (when the tab is inactive)
        oscillator.stop(audioContext.currentTime + (_length - i) / 60);
      } else
        modulationGain.gain.value =
          (i < 4 ? 0.05 * i * i : 1 - i / _length) * _vol * d.volume;
      oscillator.frequency.value = _freq + _incr * i;
      if (i++ < _length) requestAnimationFrame(playTune);
    }
  }

  var d = {
    volume: 1,
    initialized: initialized,
    start: function () {
      try {
        audioContext = new (window.AudioContext ||
          window.webkitAudioContext ||
          window.mozAudioContext ||
          window.msAudioContext ||
          window.oAudioContext)();
        this.initialized = 1;
        console.log("[Event] AudioContext initialized");
      } catch (e) {
        console.log("[Warning] AudioContext not found", e);
      }
    },
  };

  // stage starting sound, w:length
  d.d = function (w, d) {
    playSound(90, 9, 10 + w * 10, 1, d || 0, 0.05);
    playSound(30, 3, 20 + w * 10, 1, d || 0, 0.1);
    playSound(90, 5, 20 + w * 10, 2, d || 0, 0.2);
  };

  // 0:bunny die, 1-4:bunny jump
  d.b = function (w) {
    playSound(
      220,
      -9 * (w * w || 1),
      (40 / w) | 0 || 1,
      2,
      w * 60,
      0.2 - (w ? 0.14 + w / 80 : 0),
    );
    playSound(90 * (w || 1), -9, 9, 1, w * 60, 0.2 - (w ? 0.14 + w / 80 : 0));
  };

  // level complete or super bunny jump
  d.c = function (w, l, d) {
    playSound(
      300 - 90 * w * w,
      9 * w,
      (l || 8) * w,
      2 - ((w / 2) | 0),
      (d || 0) + (w - 1) * (l / 2 || 8),
      0.1 - w * 0.02,
    );
  };

  // custom //_type, _freq, _incr, _length, _delay, _vol
  d.p = function (w, f, i, l, d, v) {
    playSound(f || 120, i || 10, l || 50, w || 0, d, v || 0.1);
  };

  return d;
})();

var Tile = (function () {
  return {
    getTile: function (x, y, W, H, w, h, scale, speed, connecting, connected) {
      return {
        X: x,
        Y: y,
        W: W,
        H: H,
        w: w,
        h: h,
        x: x * w * scale,
        y: y * h * scale,
        scale: scale,
        size: h * scale,
        speed: speed || 0,
        connecting: connecting,
        connected: connected,
        count: 0,
        addUnit: function (frame, type, color, dir, sprite1, sprite2) {
          this.frame = frame;
          this.type = type;
          this.color = color;
          this.dir = dir || 0;
          this.sprite1 = sprite1;
          this.sprite2 = sprite2;
          if (sprite2) this.count = 1;
          if (type > 37) {
            this.W *= 2;
            this.w *= 2;
          } //double width unit (lion)
          else this.connected = false;
          if (type == 32 || type == 28) this.collectible = 1; //the fox got collectible
        },
        draw: function (ctx) {
          //22:boar, 24:fox>, 26:fox<>, 28:fox<+>, 30:beaver, 32:fox+>, 34:snake->, 36:empty, 38:lion
          ctx.save();
          ctx.translate(this.x + (this.type == 17 ? 12 : 32), this.y + 2);
          if (this.X && this.X <= L) {
            // define base line color ["ffaa00","ff4455","33ff44","cccccc"]
            ctx.fillStyle =
              "#" +
              (this.sprite1
                ? this.count
                  ? (this.collectible &&
                      (this.type == 28 || this.type == 32)) ||
                    (yum &&
                      this.type != 30 &&
                      this.type != 34 &&
                      this.type != 38 &&
                      !(this.type == 28 && !this.collectible))
                    ? gridColors[0]
                    : gridColors[1]
                  : gridColors[2]
                : gridColors[3]);

            // draw base line arrow
            if (
              this.type > 27 &&
              this.type != 36 &&
              this.sprite1 &&
              ((!this.collectible && this.type == 28 && yum) ||
                !yum ||
                this.type == 30 ||
                this.type == 34 ||
                this.type == 38)
            ) {
              // draw arrow tip
              ctx.fillRect(
                this.dir
                  ? this.w * this.scale - this.scale * 5
                  : this.scale * 2,
                this.h * this.scale - this.scale * 3,
                this.scale,
                this.scale * 2,
              );
              ctx.fillRect(
                this.dir
                  ? this.w * this.scale - this.scale * 6
                  : this.scale * 3,
                this.h * this.scale - this.scale * 4,
                this.scale,
                this.scale * 3,
              );

              // draw flames and collectible
              if (
                this.collectible ||
                (!this.collectible && this.type == 28 && yum) ||
                !yum ||
                this.type == 30 ||
                this.type == 34 ||
                this.type == 38
              ) {
                if (!this.dir) {
                  ctx.save();
                  ctx.scale(-1, 1);
                  ctx.translate(this.W > 24 ? -191 : -64, 0);
                }
                ctx.drawImage(
                  bunnySprites[this.collectible ? 18 : 17],
                  2,
                  0,
                  14,
                  4,
                  -4,
                  this.h * this.scale - 20,
                  56 * (this.dir ? 1 : -1),
                  12,
                );

                if (!this.dir) ctx.restore();
                else {
                  ctx.save();
                  ctx.scale(-1, 1);
                  ctx.translate(-130, 0);
                }
                if (this.collectible)
                  ctx.drawImage(
                    bunnySprites[20 + mode],
                    0,
                    0,
                    24,
                    6,
                    this.dir ? (mode ? 0 : 36) : mode ? -8 : 28,
                    this.h * this.scale - 26,
                    72,
                    18,
                  );
                if (this.dir) ctx.restore();
              }
            }
            // draw base line
            addShadow(ctx, 3);
            if ((!this.connected || !this.sprite1) && this.color != 12)
              ctx.fillRect(
                this.scale,
                this.h * this.scale - this.scale * 2,
                this.w * this.scale -
                  (this.connecting && !this.frame ? 0 : this.scale * 4),
                this.scale,
              );
            addShadow(ctx);
            // draw an enemy
            if (this.sprite1)
              this.drawImg(
                ctx,
                this.count >= this.frame ? this.sprite1 : this.sprite2,
                this.dir,
                this.w,
                this.h,
                this.W,
                this.H,
                this.scale,
                1,
                this.type == 17 ? 1.25 : 1,
              );
          } else if (this.sprite1) {
            // draw ambient, as well as the bonus item, but only if it's still not taken (yum || sprite2 == arrow)
            this.drawImg(
              ctx,
              this.sprite2
                ? yum || this.sprite2 == bunnySprites[19]
                  ? this.sprite2
                  : this.sprite1
                : this.sprite1,
              this.X,
              this.w,
              this.h + 1,
              this.W,
              this.H,
              this.scale,
              1.5,
              1,
            );
          }
          ctx.restore();

          if (this.count) {
            this.count++;
            if (this.count > this.frame * 2) {
              this.count = 1;
              if (this.type < 32 && this.type != 26)
                this.dir = !this.dir ? 1 : 0; // flip unit animation
            }
          }
        },
        drawImg: function (c, r, d, w, h, W, H, s, i, j) {
          c.scale(d ? -j : j, j * j);
          c.drawImage(
            r,
            ((w - W) * s) / 2 -
              (d
                ? this.Y == 2 && this.X == L + 1
                  ? w * 5.5
                  : w
                : i > 1
                  ? w * i
                  : 0),
            ((h - H - 2) * s) / 2,
            W * s * (this.Y == 2 && this.X == L + 1 ? 1.2 : d ? -i : i),
            H * s,
          );
          c.scale(1, 1);
        },
      };
    },
  };
})();

var hardWidth = 960;
var hardHeight = 540;
var width;
var height;

var gridColors = ["ffab00", "ff4555", "34ff44", "cdcccc"];

var playerColors = [
  "33333333bb33bbbbbbcc8866ddddddee9999ffffff", //bunny and kitty
  "1a38a5305dff33bb33b1a2a2f5b8b8ff8235ffffff", //super bunny
  "992255cc4477ffaa22aa9988f5b8b8ff7799ffffff", //super kitty
  "f64000f66200f68200ff9610ffbf10ffda10ffe65d", //boom
  "102313333333f64000f66200f68200ff9610ffd71e", //yum, level complete arrow
];
var px = [];
var P =
  "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@E@@@@@@@H}@Ho@@@@@@@@~Gxo@@@@@@@@vOxo@@@@@@@@pOx_@@@@@@@@p~xM@@@@@IIA@~hC@@@@IddL@p??@@@H[ke]IygyG@@Ykm|do}?BG@@Ym??d?l?o?HIk}|????}?uaLkm???o?C?Fg\\mdm?o}?@@@?_m|O}myo@@@hX}??iC?O[@@@X}}?Y@x?h]@@@k?_@@@}Gn@@@@?m}G@pF@@@@@}??~@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@HE@hE@@@@@@@p?@?E@@@@@@@p~A?E@@@@HII@~GoA@@@@addAvO_@@@@I[m?LpG]@@@H[kgglp~C@HAYk}?g|k??@aL[mg???mgyGg\\km????o?BG?_md|???o?o?xX?|o}}?E}?w@X???]}o@@?F@@{??C?G@@@@@y??oh?X@@@@@h?E@H?h@@@@@@}?G@}GG@@@@@x?~@x~p@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@hEiE@@@@@@@@}?Oi@@@@@@@@pv?MC@@@@@@@@pvo}G@@@@@@@A@~??@@@@@IIdDx?}@@HAH[dmm|oLG@aLYkm|dm?WGHglk?|?do}oGx?]m?????xoF@?h}d????@w@@@he?}m}?@@@@@m??iK?G@@@@x???Xy?E@@@@x??o@?G@@@@@xo?E@?@@@@@@xG@@p?@@@@@@xG@@xG@@@@@@~G@@@@@@@@@@?@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@xG@@@@@@@@@@u?@@@@HI@@@@hvG@@@ydA@@@@u~@@@?gDII@@@vE@@x?O[cI@@i}G@@?[mmdAH?g?@@@k}omLa?GzG@@{??lml}?xG@@{?|?g|m?}u@@h?g}?d?x?F@hG?oi???E@@@m??G[m?oE@@@???E@K??iE@?G?E@@@??Oy@?@@@@@@x??O@@@@@@@@@@??G@@@@@@@@@@xG@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@IA@@XyG@@@@HgDIAXq~@@@@xgL[Khq~@@@@@?[me@MvG@@@@@k}oDhqG@@@@@m??e@m~@@h]C}d?lAi?G@o@?}o|gM|gy@G???O?gl?Oz@xo??O}?|}?oG?E}?X}??l??G?@xG@k??ox?Fw@@@@h}??@w@@@@@@@}??G@@@@@@@@hm}?@@@@@@@@@@}?Y@@@@@@@@@h?OC@@@@@@@@@}Gu@@@@@@@@@x?@@@@@@@@@@@wG@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@HG@@@@@@@@@@h~@@@@I@@@@@p~@y@H?AIIA@p~@?GhgL[[LAp~@?E@g\\kmmL@~Ho@@@[}||e@~h]@@Xk??glApYE@@X}?|?dM}m@@@@k?g??g??G@@h??g}?l??G@@}??o{??}D?@@xo{M}??{Wx@@@?OXm}?x?}@@@x?@k?G@?w@@@@?Gy?A@@F@@@@pG?OC@@@@@@@@@x?Y@@@@@@@@@@}OE@@@@@@@@@p~h@@@" +
  // kitty 0
  "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@H@@@H@@@@@@@hI@@Y@@I@@@@XoIAk@HoA@@@X~]L}Ah{E@@@@soclC@_G@@@@\\~?gM@hC@@@@hoI?_@YE@@@@X?WyoHk@@@HIc}?o_h]@HIY}]l??fYC@i???oKk]Dm@H}????]I@@[@io[ck??]@@m@}]m]L{?oC@[@kk?oci?oC@m@]}??]X?]@@[Ak??oc@}C@@kK}??]D@}C@@Xkko[DA@oC@@@]}?o??Ao@@@@@k}?onF~E@@" +
  "@@@@@@@@@@@@@I@@@@@@@@@@HoA@@@@@@@@@x{M@@@@@@@@@@o{@@@@@@@@@@@]@@@@@@@@@@HkHIA@@A@@@@i[YmMA@M@@AHkMk?oM@kAHCi[X]m?oAsMXEkEko[}?CueiO]@}?mk?M]nd]mYm?oe}g{??l[]k??m{_}MyohkX}?o|?{?J?@@Hk?ok?]??}@@Y}?ol?O}?o@Hk??eh?eAks@Y}?oD{o\\@@@@k??eX}E[C@@@h?D@@k_Xm@@@@}o@@h?@}@@@@h??G@~GxG@@@@?uu@p}po@" +
  "@@@@@@@@@@@@@@H@@@@@A@@@@@yA@@@@M@@A@@oG@@@@{IHE@I}E@@@@sgiEHkk@IIA@solGi[EHkmMA]~eG[E@Y}?mKm~oO]@Hk???e{OyomAYm]}??}?J?[H[}mk??k?o?M[k?oe}?]}?o[mi??]}?oi?fhKk??e}?oCmD@Hk??]}?e@@@@Y}?oD??E@@@Ik??eh?o@@@@[??oDhoCC@@@}??e@@?XE@@@}oE@@@~hG@@@}E@@@pox@@@@ho@@@hE@@@@@h?E@@@@@@@@@@uu@@@@@@@@@" +
  "@H]kA@@@A@@@@XK[E@@@M@@A@hY]@IA@{IHExXXk[mM@sgiE_oC[k?mAsolG}]EX}?oK]~eGo[@km}?em~oOXCHmmk?o{Oyo@@X}m]??}?J?@@X?oe}?k?o?HAi??]}?]}?oiKk??e}?oi?f}]}?o\\??e@mD?o??e@k?E@@@o??oD@X}o@@@?h?e@@X}?E@@}@m@@@@}??o@~@@@@@@@x??EE@@@@@@@@@wE@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@" +
  "@Hi[]C@@@@@@Hi[]Mm@@@@@@y{]@h[@@@@@@_o@@YK@@@@@@}C@Hk]I@@@@@@@@Ymm]AxA@@@@@k}?mChO@H@HIk?}?Mh~Ai@h[Y?]?o@uOo@ho[?o{oIugl@hok?ol?l?me@h?}?ok?{??o@@?g?ol?}?I?@@}_|ml?k?Wy@@h?Xc{?]}o?@@p}@@{?oi?o@@@~@@h?e@}D@@@E@@@}E@@@@@@@@@@}oA@@@@@@@@@}?M@@@@@@@@@h?oA@@@@@@@@@h?MA@@@@@@@@@x?M@@@@@@@@@@~n" +
  "x]A@@@@@@@@@_oK@@@@@@@@@}}]@@@@@@@@@@Xk@@@@@@@@@@h]@HI@@@@@@@[E@imA@@@@@h]@H}?M@A@@@[C@i??o@M@@Am@Hko}?A{IHE]IY}?m?EsgiEkk[}?e}OsolGhkX??_|o]~eG@@X??ok?m}oD@@k??ol?{OyO@h}??e{?}?J?@h?km\\??k?o?@@}OH}??_}?o@@h?h??oeh?f@@@}_ok]@@mD@@@pO?M@K@@@@@@@FyoY[A@@@@@@@h?M\`C@@@@@@@@}oAD@@@@@@@@pwE@@@" +
  // 12 - super bunny 1 - idle
  "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@?@@@HSJ@@@@@}@@@YJAA@@@PQ@@HSAHjQQCHJ@@YJHAu_JZQA@@HKjWySAQJ@@@@Q|OZJ@HA@@@@@@@QA@@@@@@@HsN@@@@@@@@@YVRRrC@@@@@@qRIIRrA@@@@HVJ@@IRJ@@@@HRA@@@QRA@@@QJ@@@@@Qr@@@hN@@@@@p}G@x?g@@@@@\`??" +
  // 13 - super bunny 2 - fly
  "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@x@@@HRJJ@@@@|@@XRJZQA@@QE@PSI@yKJJJZ@@ZJ\`Ou_QPY@@@HS}OzKB@@@@@@@HQYQ@@@@@@@HCHJ@@@@@@@@YrB@qSJ@@@@IVJIIRJRA@@HSJA@@@QR@@@YRA@@@QR@@@@VB@@@hN@@@@@U@@@@@?E@@@@?@@@@@@@@@@@" +
  // 14 - bunny head
  "@@x?h?@@@@@@@@xeGlG@@@@@@@@o|\`}@@@@@@@@xeg??G@@@@@@@h|g??@@@@@@@@??@?G@@@vvF@??_xG@@v@@pv|????@@@@vF@\`???o@@@@@@@@h?o@@@@@@@@@@@@@@@@@@@@@@@@@@@@@x?h?@@@@@@@@xeGlG@@@@@@@@o|\`}@@@@@@@@xeg??G@@@@@@@h|g??@@@@@@@@??@?G@@@@vE@??_xG@@v@@vv|????@@@vv@@\`???o@@@@@@@@h?o@@@@@@@@@@@@@@@@@@@@@@@@@@@" +
  // 15 - kitty head
  "@@@@?D@@\`G@@@@@@wgD\`|E@@@@@@o~|?gE@@@@@@ou???D@@@@@@x}g??G@@@p@@@??@?G@@@@nF@??_x?@@v@@uu|????@@@nn@@\`???o@@@@@@@@\`??E@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@?D@@\`G@@@@@@wgD\`|E@@@@@@o~|?gE@@@@@@ou???D@@@@@@x}g??G@@@@@@@??@?G@@@uuu@??_x?@@p@hhn|????@@@pE@@\`???o@@@@@@@@\`??E@@@@@@@@@@@@@@@@@@@@@@@@@@" +
  // 16 - hit
  "@@@@J@@@@@@@@@BPA@@@@@@@@@AJ@@@@@@@@@@JTHB@@@@@@@BQQQ@@@@@@@@QHbB@@@@@@@@HRQThE@@@@@@@HJbunE@@@@@@@Pk~wn@@@@@@@@uuvm@@@@@@@hnn?vE@@@@@@huuv?n@@@@@@Xmvuvm@@@@@@@knvuvE@@@@@@Xmnv?n@@@@@@@knnvm@@@@@@@Xmu~wE@@@@@@@XuuvE@@@@@@@@ku}n@@@@@@@@@kum@@@@@@@@@XuwE@@@@@@@@@k}E@@@@@@@@@@kn@@@@@@@@@@Xm" +
  // 17 - yum
  "@?v@@xF@@pG@@nlFpft@@nG@@p\\tf\\cFpmF@@p]c\\SZtnt@@@@f[[JQk\\t@@@@p\\SJQ[[t@@@@p\\JIQJZuv??v@fSIIQcmd|omvfSJIQc[[upedl\\JIQ[RcF@f[[[RIRQ[t@@p\\SJJIIZcF@@@f[SIIIZt@@@@p\\RIIIQcF@@@fSIIIQ[[tF@p\\JRIIZlddv@f[[SJIZcvn|p\\dl\\JIQcFp?flunSQJRZt@@?v@fS[JZRcF@@@@f[dSZ[cF@@@@fcv\\cddt@@@pet@ftvedG@@xwF@pG@v~G" +
  // 18 - zap
  "@?v@@xF@@pG@@nlFpft@@nG@@p\\tf\\cFpmF@@p]c\\SZtnt@@@@f[[JQk\\t@@@@p\\SJQ[[t@@@@p\\JIQJZuv??v@fSIIQcmd|omvfSJIQc[[upedl\\JIQ[RcF@f[[[RIRQ[t@@p\\SJJIIZcF@@@f[SIIIZt@@@@p\\RIIIQcF@@@fSIIIQ[[tF@p\\JRIIZlddv@f[[SJIZcvn|p\\dl\\JIQcFp?flunSQJRZt@@?v@fS[JZRcF@@@@f[dSZ[cF@@@@fcv\\cddt@@@pet@ftvedG@@xwF@pG@v~G" +
  // 19 - arrow
  "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@HB@@@@@@@@@@yF@@@@@@@@@HwE@@@@@@@@@ynD@@@@@@@@HweKJJJB@@@@ynnffffV@@@@wwwwwwwL@@@@xnnffffF@@@@@weC@@@@@@@@@xnD@@@@@@@@@@wE@@@@@@@@@@xF@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@" +
  // 20 - carrot
  "@@@@J@@@@@@@@@BPA@@@@@@@@@AJ@@@@@@@@@@JTHB@@@@@@@BQQQ@@@@@@@@QHbB@@@@@@@@HRQThE@@@@@@@HJbunE@@@@@@@Pk~wn@@@@@@@@uuvm@@@@@@@hnn?vE@@@@@@huuv?n@@@@@@Xmvuvm@@@@@@@knvuvE@@@@@@Xmnv?n@@@@@@@knnvm@@@@@@@Xmu~wE@@@@@@@XuuvE@@@@@@@@ku}n@@@@@@@@@kum@@@@@@@@@XuwE@@@@@@@@@k}E@@@@@@@@@@kn@@@@@@@@@@Xm" +
  // 21 - fish
  "@@@@@@@@@vvn@@@@@@@@v|?o@@@@@@@pgY?n@@@@@@Xt?zwU@@@@@@ci~?nE@@@@@XL\\uwm@@@@@@caqcnuE@@@@XLL~UtmF@@@@caqonbv@@@o^LL~L\\\\\\@@xuSaqgaccC@@h^XLNL\\\\\\B@@@@\`yaaccS@@@@@Kwd\\\\\\r@@@@@cNdSSCnF@@@Xtc\\Z@@xE@@@c^\\C@F@w@@hnobCxjF@@@@@}U[@@wE@@@@@hjB@@xE@@@@@VuE@@x@@@@@@@hF@@G@@@@@@@PE@@@@@@@@@@h@@@@@@@@@" +
  // enemy animals

  // 22 - boar
  "@UU@@@@@@PUE@@\`U@@B@Pe@@@@BlBxQ@oDA@@@O\`UijJeHG@@xjAbegeJjz@@xUJlbejDQ}@@@oAeUTeUHG@@@xPjljllA@@@@@AQbejAQ@@@@JLHUUMHMB@@PA}CilA{BQ@@JPhQeeUQPH@\`AiBMeeMEjQPXHPHRQQQJH@YAssCBebEBssCHH^~h@Ehx^N@AAPEiY_iA@AAHHAzH{}KxUHH@AHhBF@FjBAA@jBAUqsPEHH@PeUHHJHJHJJ@\`HhBA@AAQQUA@AAMHHHHhjjA@HIiA@IA@UQ@" +
  "@UU@@@@@@PUE@@\`U@@B@Pe@@@@BlBxQ@oDA@@@O\`UijJeHG@@xjAbegeJjz@@xUJlbejDQ}@@@oAeUTeUHG@@@xPjljllA@@@@@AQbejAQ@@@@JLHUUMHMB@@PA}CilA{BQ@@JPhQeeUQPH@\`AiBMeeMEjQPXHPHRQQQJH@YAssCBebEBssCHH^~h@Ehx^N@AAPEiY_iA@AAHHAzH{}KxUHH@AHhBF@FjBAA@jBAUqsPEHH@PeUHHJHJHJJ@\`HhBA@AAQQUA@AAMHHHHhjjA@HIiA@IA@UQ@" +
  // 24 - fox <>
  "@@V]@@@sE@@@@@{iC@Xn@@@@@@cOTjeC@@@@@@\`JjdlE@@@@@@hjUIbU@@@@@@HmlCWlB@@@@@PJeee]e@@@@@@UJilLH@@@@@@mUJlUA@^F@@@PmmUA@ps@@@@HjJ@@@^^@HE@@^BiB@sc@il@sciJU@]T@Hbm]TaUjBhkB@RbmJlRiAPUU@@MR\`UIJ@hjj@hD@lJbUAQeU@\`eeUZ\\JHjjJ@@PRRpsmBQUU@@@@E\\^TIjjJ@@@@HcckBQUA@hlJmM@@HHJ@@eUhjjmUBIA@@kBXZQmmU@@@" +
  "@@h^@@@nZ@@@@@@uC@XM_@@@@@@Xlmby\\@@@@@@hedUQD@@@@@@jTIjUE@@@@@PezXemB@@@@@lklllRB@@@@@HbeMRj@^F@@@QmTQmE@psC@@@QmmU@@X^F@@@@HjJB@@ss@E@@pSIU@@\\^ibEX^LUiB@bkHRlmcJlJUP]U@HRlUaURMhjj@@HRBlJQAQeU@@\`E\`UQmJjjJ@@lllRcSAQUU@@PRRX^mJjjB@@@@\`ssSBQUA@@@@@\\\\mIHJ@@hUimE@@HIA@@mBUUmmRB@@@@S@SKjmmU@@@" +
  // 26 - fox static
  "@@h^@@@nZ@@@@@@uC@XM_@@@@@@Xlmby\\@@@@@@hedUQD@@@@@@jTIjUE@@@@@PezXemB@@@@@lklllRB@@@@@HbeMRj@^F@@@QmTQmE@psC@@@QmmU@@X^F@@@@HjJB@@ss@E@@pSIU@@\\^ibEX^LUiB@bkHRlmcJlJUP]U@HRlUaURMhjj@@HRBlJQAQeU@@\`E\`UQmJjjJ@@lllRcSAQUU@@PRRX^mJjjB@@@@\`ssSBQUA@@@@@\\\\mIHJ@@hUimE@@HIA@@mBUUmmRB@@@@S@SKjmmU@@@" +
  "@@V]@@@sE@@@@@{iC@Xn@@@@@@cOTjeC@@@@@@\`JjdlE@@@@@@hjUIbU@@@@@@HmlCWlB@@@@@PJeee]e@@@@@@UJilLH@@@@@@mUJlUA@^F@@@PmmUA@ps@@@@HjJ@@@^^@HE@@^BiB@sc@il@sciJU@]T@Hbm]TaUjBhkB@RbmJlRiAPUU@@MR\`UIJ@hjj@hD@lJbUAQeU@\`eeUZ\\JHjjJ@@PRRpsmBQUU@@@@E\\^TIjjJ@@@@HcckBQUA@hlJmM@@HHJ@@eUhjjmUBIA@@kBXZQmmU@@@" +
  // 28 - fox <+>
  "@@V]@@@sE@@@@@{iC@Xn@@@@@@cOTjeC@@@@@@\`JjdlE@@@@@@hjUIbU@@@@@@HmlCWlB@@@@@PJeee]e@@@@@@UJilLH@@@@@@mUJlUA@^F@@@PmmUA@ps@@@@HjJ@@@^^@HE@@^BiB@sc@il@sciJU@]T@Hbm]TaUjBhkB@RbmJlRiAPUU@@MR\`UIJ@hjj@hD@lJbUAQeU@\`eeUZ\\JHjjJ@@PRRpsmBQUU@@@@E\\^TIjjJ@@@@HcckBQUA@hlJmM@@HHJ@@eUhjjmUBIA@@kBXZQmmU@@@" +
  "@@h^@@@nZ@@@@@@uC@XM_@@@@@@Xlmby\\@@@@@@hedUQD@@@@@@jTIjUE@@@@@PezXemB@@@@@lklllRB@@@@@HbeMRj@^F@@@QmTQmE@psC@@@QmmU@@X^F@@@@HjJB@@ss@E@@pSIU@@\\^ibEX^LUiB@bkHRlmcJlJUP]U@HRlUaURMhjj@@HRBlJQAQeU@@\`E\`UQmJjjJ@@lllRcSAQUU@@PRRX^mJjjB@@@@\`ssSBQUA@@@@@\\\\mIHJ@@hUimE@@HIA@@mBUUmmRB@@@@S@SKjmmU@@@" +
  // 30 - beaver
  "@@@@HEhA@@@@@@@@YBZO@@@@@@@xHPOPA@@@@@@JjlaJ@@@@@@PaeJjlJ@@@@@@WQQ|PUA@@@@QHJjAjzJ@@@@_FU}sPTM@@@@EojjGBbjA@@@aeeUUMPTM@@@PllllACbzAxJ@zzzJX^QTGQQO@@@@sCbMJjJB_^^^^PWDQ~UU@pssCyeey@^beJX^NlllP@@UllBxC~UCz@@@eUQMhwZPM@@@HHoWA@@jA@@PQA}zzJJM@@@JjjooWPQA@@PU}JBQAijJ@@iiWQ@@@QMUAHM}JJ@@@HjiJ" +
  "@@@@@HEM@@@@@@@@@YB{A@@@@@@@HHxAO@@@@@@@@UUUA@@@@@@@jjjbJ@@@@@@QGeUUeA@@@@PMHjljzA@@@PoA^WPTTM@@@JeMzjBjbjA@@illiTMPUTM@@@beeeBChbzA@@PWWWX^AWTO@@@@@@sCzeMzn^@_^^^PoTDU]lJ@ssCyeeMzxeeJ@^NlllDU@jllJxC~e]Hz@@beUAHh~FQM@@HHHoWA@HjA@@@QA}}zyQM@@@HjjioWOjA@@@QU}BJJPMJ@@HjiWA@@QUQA@PM}JB@@HjJJ" +
  // 32 - fox +>
  "@@h^@@@nZ@@@@@@uC@XM_@@@@@@Xlmby\\@@@@@@hedUQD@@@@@@jTIjUE@@@@@PezXemB@@@@@lklllRB@@@@@HbeMRj@^F@@@QmTQmE@psC@@@QmmU@@X^F@@@@HjJB@@ss@E@@pSIU@@\\^ibEX^LUiB@bkHRlmcJlJUP]U@HRlUaURMhjj@@HRBlJQAQeU@@\`E\`UQmJjjJ@@lllRcSAQUU@@PRRX^mJjjB@@@@\`ssSBQUA@@@@@\\\\mIHJ@@hUimE@@HIA@@mBUUmmRB@@@@S@SKjmmU@@@" +
  "@@V]@@@sE@@@@@{iC@Xn@@@@@@cOTjeC@@@@@@\`JjdlE@@@@@@hjUIbU@@@@@@HmlCWlB@@@@@PJeee]e@@@@@@UJilLH@@@@@@mUJlUA@^F@@@PmmUA@ps@@@@HjJ@@@^^@HE@@^BiB@sc@il@sciJU@]T@Hbm]TaUjBhkB@RbmJlRiAPUU@@MR\`UIJ@hjj@hD@lJbUAQeU@\`eeUZ\\JHjjJ@@PRRpsmBQUU@@@@E\\^TIjjJ@@@@HcckBQUA@hlJmM@@HHJ@@eUhjjmUBIA@@kBXZQmmU@@@" +
  // 34 - snake
  "@@HjQUI@@@@@@HQMjjjI@@@@HQex^eUTI@@@Qj[lTilZVA@@XC@xeJbUqJ@@@F@_TQilJVA@@pxk@HJeES@@@@\`E@@QlJC@@@@@@@HbUY@@@@@@@@Q\\jD@@C@@@@QeSE@@@E@@@QllB@@jCZ@@Pl^U@@PCZE@@aslB@@j@@@@Hj^B@@@UA@@@PucA@@@lJ@@@P\\nHHI@\`UA@@HucBQSA@lL@@Ab^UXZJ@\`eAHJPecJ@SAHkLQ]AP]kR@HAuKilKBj\\kkBh^UPeU]@PeJXZmB@jjjjCHAQUA@" +
  "@@@@@HII@@@@@@@@IiQQI@@@@@@IREjjSA@@@@IjtxUeuJ@@@HR]{eeULVA@@@{@@oQaUqB@@@pPRBHJLXA@@@@F@@@aES@@@@@@@@QlZBX@@@@@@HbUU@@C@@@@@Q\\l@@k@@@@@aecBX]E@@@@PllB@bC@@@@@buU@Pl@@@@@P\\^B@hTA@@@@buk@@@eJA@@@Q^L@@@hmJ@@@hsEHIA@hkA@@Q^mYZJA@]M@IhtkEHSKQukHUCjekB@@j^VQlZ@jUP]jscBPeU]@@jss]U@@jjjjK@jjJ@@" +
  // 36 - empty
  "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@" +
  "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@" +
  // 38 - lion
  "@@@@@@@@PRB@@@@@@@@@@@@@@@@@RRB@j@Q@@@@@@@@@@IA@@@@mEmU@eIU@@@@@@@@@HUMA@@@@@PleLQE@@@@@@@@@hjjJ@@@@XN\`UIjhOO@@@HII@QUPU@@@Xv@QlREY]YG@@QRRAjJ@jXuvvFOCjjQkJ{A@iedlJPE@Ph[ss^^NemjTk_MImlURUI@@i@pvvvvshdUe}}{mbedljJ@HUp^[[[sfCblSlkORedlmUUAhj@p|x@\\^^PeZb}{mddmdmjBUD@@Fp@pssCjT]jQbdmbdljAb@@@@@@XvXLyeU{mdlJedljBPA@@@@@pvCHM_|abdUPdljU@@Dh\`@XXv^\\ijQKjdTBidmUB@@@}|CsvvcHWUlOPR@HblmBH@@@pvvv[F@@yld}A@@PeljJIB@@Xv@@@@@@PdmUHB@PjdmRPB@@@@@@@@@@jmU@QB@@PedUPUU@@@@@@@@jdU@IRG@@@jeUHjjB@@@@@@PemB@jU@@@@@mR@QUE@@@XDjmlB@Plz@@@PjUB@@jJ@@@clllMU@cEB@@PjmUA@TQ@@@@NHQ{@YB@@@@XZTIm@@@@@" +
  "@@@@@@@@RR@@@@@@@@@@@IA@@@@@@@@PEHB@@@@@@@@@HjJ@@@@PRR@hLiB@@@@@@@@@iUUA@@hmhmBdIjHOO@@@@@@@UJjJ@@@@@bmJQEy]Y@@@IIAHjAPU@@@@sAlUjHZJ{G@HRRJPU@iB@@@sFHbUMQkk_AHmddUAJHR@kvvvxYPdmjT}}HiemRjJ@PE@][^vssijdU]b]oUlddUUAhj@@vvvv^FQblPSlQjddmmjJ@TEv[[[[v\\@QeajSoedlelUU@\`B@fGG\`sssCjJHjRdlUddUM@Q@@p@F@^^\\LxeU{edUiddUU@D@@@@@@pvcHM_|adlBbdUmB@@@@ED@Cs^\\ijQKjdTBidmUB@@@hg_Xvvf@yjb}AR@HblmBH@@@@vvv^s@@HgelO@@@jdUUB@@@@sF@@@@@BPdmUA@@RelUB@@@@@@@@@@UQAUmjB@@@PedUU@@@@@@@@kJH@jeU@@@@@jemjB@@@@@@pKSA@jlU@@@@@@mRUE@@@@@@@@YDjmlB@@@@PjUBjJ@@@@@@@clllMU@@@@PjmUQQ@@@@@@@@CHQ{@YB@@XZTIm@@@@";

P.replace(/./g, function (a) {
  let q = a.charCodeAt();
  px.push(q & 7);
  px.push((q >> 3) & 7);
});

var i,
  j,
  k,
  l,
  m,
  n,
  o,
  p = 0;
var sprites = [];
var bunnySprites;

// initialize sprites data
j = px.length / 576;
for (i = 0; i < j - 4; i++) {
  sprites.push(px.splice(0, 576));
}
sprites.push(px.splice(0, 1152));
sprites.push(px.splice(0, 1152));

var scale = 4; //scale multiplier
var H = 24; // sprite width
var W = 24; // sprite height

var board;
var level;
var L = 5; // collumns
var R = 5; // rows

var running = 1;
var end;
var win;
var fff;

var monet; // monetization : if subscribed, user can change levels. we do not want that in webxdc
var master; // game has been cleared, 1:super bunny, 2:super kitten

var mode = 1;
var lives = -1;
var collects;
var time;
var globaltime;
var besttime;
var score = 0;
var tscore = 0;
var hiscore = 0;
var bonus;
var multi = 10;
var oldmulti;

var dir = 1; // bunny facing direction 0:left, 1:right
var posX = 0; // bunny position, linked to the board collumn position, integer 0-R
var bunnyY; // bunny position real y
var jump; // jump frames, 0:idle
var jumpfps = 2; // jump frame skipping
var bunnyDieY;
var dieY;
var callback; // function called after bunny die animation

var yum;
var boom;

var enemyColors = [
  ,
  "1cac006dd200886644c3f409de4e00fa651dff8421", //1 - carrot
  "11ddff2244662255cc4488ccdd7d16f5a83bfac34d", //2 - fish
  "803e0ccc5800e7b2b2ee9653f57a1dfafafaff1900", //3 - orange
  "813e0cc75600d8b7a9ef9653f67a1dfcfbfafb4936", //4 - orange 2
  "972900cc3c00ddb3acff793cf85e17efefeffa0313", //5 - dark orange/red
  "5b4146b25b76f0e1efe5a3a3cb8c8ce4b3e0936f6f", //6 - pink, old snake
  "625329a98d40d9c7bfd6ba90d69e66f9f9f9bf6428", //7 - ocher
  "7b1d38cf665bf7dae4e9c2bce29d94fefefee42e59", //8 - pink
  "6544668f4e90e1dae6be7dc0b361b2fdfdfdc33f9c", //9 - violet
  "444440777770e8b2b2ccccc0aaaaa0eeeee0cf3838", //10 - grey with red hilight, snake
  "006c0a00a00faded8554fc6510dd21f1fef02cc400", //11 - green snake
  "0b4d830483d505edf44cd5f21bb1f0f5f5f551fffb", //12 - blue snake
];

var levels;
var speeds;
var offsets;
var spaces;

var gridContext = gridCanvas.getContext("2d");
var bunnyContext = bunnyCanvas.getContext("2d");
gridContext.imageSmoothingEnabled = bunnyContext.imageSmoothingEnabled = false;

window.onload = initGame();

function initGame(e) {
  console.log("[Event] Game initialized"); // in "+screen.orientation.type+" mode");
  window.focus();
  //screen.orientation.lock("landscape-primary").catch(function(error){console.log("[Warning] Screen orientation locking is not supported")});
  //screen.orientation.addEventListener("change", resize, false);
  window.addEventListener("resize", resize, false);
  resize();

  e = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    ? "touchstart"
    : "mousedown";
  game.style.backgroundImage = "linear-gradient(#535,#323,#181618,#346,#a57)";
  game.addEventListener("click", gameClick);
  leftbtn.addEventListener(e, leftClick, { passive: false });
  rightbtn.addEventListener(e, rightClick, { passive: false });

  document.addEventListener("keydown", keyDownHandler);

  document.addEventListener("fullscreenchange", fullscreenCheck);

  // generate player sprites (bunny/kitty colors depending on mode)
  bunnySprites = [];
  for (i = 0; i < 22; i++) {
    bunnySprites.push(
      getUnit(
        i,
        i > 16 ? (i > 19 ? 1 : 3) + (i % 2) : i > 11 ? 1 + mode : 0,
        i > 19 ? enemyColors : playerColors,
      ),
    );
  }

  createMenu();
}

function resize(e) {
  width = document.documentElement.clientWidth;
  height = document.documentElement.clientHeight;
  if (e) console.log("[Event] Resized, new dimensions:", width, height);
  e = width / hardWidth;
  e =
    height / width > hardHeight / hardWidth
      ? e
      : height / hardHeight < e
        ? height / hardHeight
        : e;
  updatePosition(
    menu,
    (width - hardWidth) / 2,
    (height - hardHeight) / 2,
    e,
    1,
  );
  updatePosition(
    game,
    (width - hardWidth) / 2,
    (height - hardHeight) / 2,
    e,
    1,
  );
}

function updatePosition(c, x, y, s, z) {
  c.style.transform =
    "translateX(" +
    x +
    "px) translateY(" +
    y +
    "px)" +
    (s ? " scale" + (z ? "" : "X") + "(" + s + ")" : "");
  return c;
}

// draw Title Screen
function createMenu() {
  var encodedName = allHighscoreName.replace(
    /[\u00A0-\u9999<>\&]/g,
    function (i) {
      return "&#" + i.charCodeAt(0) + ";";
    },
  );
  var hiscoreMsg =
    allHighscore > 0
      ? "Hiscore " + allHighscore + " held by " + encodedName
      : "";
  menu.innerHTML =
    "<div id=logo class=d onclick=startNewGame()></div><div id=hero><div style=top:154px>" +
    hiscoreMsg +
    "<br/>&nbsp;Developed by Noncho Savov, FoumartGames 2019. Submission in JS13K games. Inspired by Super Bunny by Vic Leone, DataMost Inc. 1983</div></div>";
  var titleArr = [
    [[4, 5, , -2, , 3, , 3]],
    [[4, 5, -0.5, -1, , 3, , 3]],
    [
      [12, 4, , , 3, , 3, 1],
      [12, 4, , 6.5, 1, 3, 1, 3],
      [14, 4, -2, 14, 3, 1, 3],
      [3.5, 3.5, 0.5, 3.5, 1, 1, 1, 1, 1, , 1],
      [4, 4.5, 7.5, 10, 1, 1, 1, 1, 1, , 1],
    ],
    [
      [10, 4, , 14, 1, 1, 3, 3],
      [4.5, 4, , 6.6, , 3, 1, 1],
      [4.5, 4, 5.5, 7, 3, , 1, 1],
      [3.5, 4.5, 0.5, 10, 1, 1, 1, 1, 1, , 1],
      [3.5, 4, 6, 10.5, 1, 1, 1, 1, 1, , 1],
    ],
    [
      [10, 4, , 7, 3, 3, 1, 1],
      [10, 4, , 14, 1, 1, 3],
      [3.5, 5, 0.5, 17.5, 1, 1, 2.5, , 1],
      [3.5, 4, 0.5, 10.5, 1, 1, 1, 1, 1, , 1],
      [3.5, 4, 6, 10.5, 1, 1, 1, 1, 1, , 1],
    ],
    [
      [10, 4, , 7, 3, 3, , 1],
      [10, 4, , 14, 1, , 3, 3],
      [3.5, 4, 0.5, 10.5, 1, 1, 1, 1, 1, , 1],
      [4.5, 3, 3.5, 11, 1, 3, 3, 1, , , , 1],
    ],
    [
      [4.5, 4, , 6.6, , 3, 1, 1],
      [4.5, 4, , 14, 1, 1, 3],
      [3.5, 4.5, 0.5, 10, 1, 1, 1, 1, 1, , 1],
      [5, 4, 3.5, 6.6, 3, , 3, 1, , , , 1],
    ],
    [],
    [],

    [
      [12, 4, -2, , , 3, 1, 3],
      [12.5, 4, -0.5, 6.5, 1, 3, 1, 1],
      [14.5, 4, -2.5, 14, 3, 1, 3],
      [4, 3.5, , 3.5, 1, 1, 1, 1, 1, , 1],
      [3.5, 3.5, 6, 3.5, 1, 1, 1, 1, 1, , 1],
      [4, 4.6, , 10, 1, 1, 1, 1, 1, , 1],
      [3.5, 4.6, 8, 10, 1, 1, 1, 1, 1, , 1],
    ],
    [
      [10, 4, , 14, 1, 1, 3, 3],
      [4.5, 4, , 6.6, , 3, 1, 1],
      [4.5, 4, 5.5, 7, 3, , 1, 1],
      [3.5, 4.5, 0.5, 10, 1, 1, 1, 1, 1, , 1],
      [3.5, 4, 6, 10.5, 1, 1, 1, 1, 1, , 1],
    ],
    [
      [4, 5, , 6, , 3, , 1],
      [7, 4, 3, 7, 3, 3, 1, 1, , , , 1],
      [4.5, 4, , 14, 1, 1, 3, 3],
      [4.5, 5, 5.5, 14, 1, 1, , 3],
      [3.5, 4, 6, 10.5, 1, 1, 1, 1, 1, , 1],
      [3.5, 4, 0.5, 10.5, 1, 1, 1, 1, 1, , 1],
    ],
    [
      [4, 5, , 6, , 3, , 1],
      [7, 4, 3, 7, 3, 3, 1, 1, , , , 1],
      [4.5, 4, , 14, 1, 1, 3, 3],
      [4.5, 5, 5.5, 14, 1, 1, , 3],
      [3.5, 4, 6, 10.5, 1, 1, 1, 1, 1, , 1],
      [3.5, 4, 0.5, 10.5, 1, 1, 1, 1, 1, , 1],
    ],
    [
      [4.5, 4, , 7, 3, 3, 1, 1],
      [4.5, 6, 5.5, 5, 3.5, , 1, 1],
      [10, 4, , 14, 1, 1, 3, 3],
      [3.5, 4, 0.5, 10.5, 1, 1, 1, 1, 1, , 1],
      [3.5, 4, 6, 10.5, 1, 1, 1, 1, 1, , 1],
      [3.5, 5, 3.5, 17.5, 1, 1, , 2.5, 1],
    ],
    [[4, 5, -1, -1, 3, , 3]],
    [[4, 5, -0.5, -2, 3, , 3]],
  ];
  drawTitle(titleArr, -13, 25, 7.5, "s");

  titleArr = [
    [[7, 8, 4, 1, , 3]],
    [[4, 5, , 4, , 3]],
    [[8, 6, , 3, 3, 3]],
    [[4, 4, , 5, 3, 3]],
    [[4, 9, , , 3]],
    [[4, 9, -0.2, , , 3]],
    [
      [22, 3, 9, 2, 3, 3, , , , , 1],
      [36, 4, , 5, 3, 3],
    ],
    [[27, 4, , 5, 3, 3]],
    [[5, 4, , 5, 3, 3]],
    [[3, 8, , 1, 2]],
    [[4, 10, -0.5, -1, 3, 3]],
    [[5, 6, , 3, 3]],
  ];
  drawTitle(titleArr, -37, 272, 8, "t m");
  drawTitle(titleArr, -37, 240, 8, "t");

  var txt = getUnit(); // using getUnit here only to generate a canvas for the title text
  logo.appendChild(txt);
  var txtCtx = txt.getContext("2d");
  updatePosition(txt, 990, 150, 3.6, 1).style.letterSpacing = "1.5px";

  m = 0;
  animateMenu();

  var bunnyhead, bunnyhead2, bunnybody, kittyhead, kittyhead2, kittybody;

  function animateMenu() {
    if (!level) {
      m++;
      if (m == 20) {
        txt.className = "c v";
        drawTitleTxt();
      }
      if (m == 40) {
        kittyhead = hero.appendChild(getUnit(15, 2, playerColors, 0, 12));
        updatePosition(kittyhead, -190, -26, 1.6, 1).className = "c e v";
        kittyhead2 = hero.appendChild(getUnit(15, 2, playerColors, 0, 12));
        kittyhead2.getContext("2d").clearRect(0, 0, 24, 24);
        kittyhead2
          .getContext("2d")
          .drawImage(
            bunnySprites[15],
            0,
            H / 2,
            W,
            H / 2,
            0,
            12 - H / 2,
            W,
            H / 2,
          );
        kittyhead2.style.visibility = "hidden";
        updatePosition(kittyhead2, -190, -26, 1.6, 1).className = "c e v";
        kittybody = hero.appendChild(getUnit(12, 2, playerColors));
        updatePosition(kittybody, -190, -26, 1.6, 1).className = "c e v";
        kittybody.onclick = function () {
          startNewGame(1);
        };
      }
      if (m == 50) {
        bunnyhead = hero.appendChild(getUnit(14, 1, playerColors, 0, 12));
        updatePosition(bunnyhead, -395, -14, 2, 1).className =
          "c e v" + (!monet && !master ? " g d" : "");
        bunnyhead2 = hero.appendChild(getUnit(14, 1, playerColors, 0, 12));
        bunnyhead2.getContext("2d").clearRect(0, 0, 24, 24);
        bunnyhead2
          .getContext("2d")
          .drawImage(
            bunnySprites[14],
            0,
            H / 2,
            W,
            H / 2,
            0,
            12 - H / 2,
            W,
            H / 2,
          );
        bunnyhead2.style.visibility = "hidden";
        updatePosition(bunnyhead2, -395, -14, 2, 1).className =
          "c e v" + (!monet && !master ? " g d" : "");
        bunnybody = hero.appendChild(getUnit(12, 1, playerColors));
        updatePosition(bunnybody, -395, -14, 2, 1).className =
          "c e v" + (!monet && !master ? " g d" : "");
        if (monet || master) bunnybody.onclick = startNewGame;
      }
      if (m == 60) {
        updatePosition(
          hero.appendChild(getUnit(34, 8, enemyColors)),
          320,
          0,
          1.8,
          1,
        ).className = "c e v";
        updatePosition(
          hero.appendChild(getUnit(35, 8, enemyColors)),
          320,
          0,
          1.8,
          1,
        ).className = "c e v";
        hero.lastChild.style.visibility = "hidden";
      }
      if (m == 120) {
        hero.lastChild.style.visibility = "visible";
        hero.lastChild.previousSibling.style.visibility = "hidden";
      }
      if (kittyhead && bunnyhead) {
        if (((m / 8) | 0) % 2 == 0) {
          kittyhead.style.visibility = "visible";
          kittyhead2.style.visibility = "hidden";
        } else {
          kittyhead.style.visibility = "hidden";
          kittyhead2.style.visibility = "visible";
        }
        if (((m / 12) | 0) % 2 == 0) {
          bunnyhead.style.visibility = "visible";
          bunnyhead2.style.visibility = "hidden";
        } else {
          bunnyhead.style.visibility = "hidden";
          bunnyhead2.style.visibility = "visible";
        }
      }

      if (m > 140) {
        m = 60;
        hero.lastChild.style.visibility = "hidden";
        hero.lastChild.previousSibling.style.visibility = "visible";
        txtCtx.clearRect(0, 0, txt.width, txt.height);
        drawTitleTxt();
      } else if (m > 85) {
        txtCtx.globalAlpha = 0.05;
        txtCtx.fillText("PLAY", 124, 125);
        txtCtx.globalAlpha = 1;
      }
      requestAnimationFrame(animateMenu);
    } else if (level == -1) {
      level = 0;
      createMenu();
    }
  }

  function ucString(str, maxLen) {
    let ret = str;
    if (ret.length > maxLen) {
      ret = ret.substring(0, maxLen).trim();
    }
    return ret.toUpperCase();
  }

  function drawTitleTxt() {
    addShadow(txtCtx, 1, 1, "#935");
    txtCtx.fillStyle = "#fab";
    txtCtx.font = "bold 16px Courier New";
    var msg = ucString(selfNameShort, 10) + " STRIKES BACK";
    txtCtx.fillText(msg, 10, 70);
    addShadow(txtCtx);
  }
}

function drawTitle(titleArr, baseLeft, baseTop, scale, className) {
  var piece;
  var segment;
  var pieceWidth;
  for (var i = 0; i < titleArr.length; i++) {
    pieceWidth = 0;
    for (var j = 0; j < titleArr[i].length; j++) {
      segment = titleArr[i][j];
      if (pieceWidth < (segment[0] || 0) + (segment[2] || 0))
        pieceWidth = (segment[0] || 0) + (segment[2] || 0);
      piece = document.createElement("div");
      logo.appendChild(piece).className = className;
      piece.style.width = (segment[0] * scale || 0) + "px";
      piece.style.height = (segment[1] * scale || 0) + "px";
      piece.style.left = baseLeft + (segment[2] * scale || 0) + "px";
      piece.style.top = baseTop + (segment[3] * scale || 0) + "px";
      piece.style.borderRadius =
        (segment[4] * scale || 0) +
        "px " +
        (segment[5] * scale || 0) +
        "px " +
        (segment[6] * scale || 0) +
        "px " +
        (segment[7] * scale || 0) +
        "px";
      if (segment[8]) piece.style.borderTop = "none";
      if (segment[9]) piece.style.borderRight = "none";
      if (segment[10]) piece.style.borderBottom = "none";
      if (segment[11]) piece.style.borderLeft = "none";
    }
    baseLeft += pieceWidth * scale + scale;
  }
}

window.startNewGame = (e) => {
  if (!FX.initialized) FX.start(); // start soundFX
  setTimeout(startSong, 610);
  menu.style.display = "none";
  if (e == 1) mode = 1;
  else if (e) mode = 0;
  lives = mode ? 9 : 6;
  level = 1;
  score = 0;
  yum = 0;
  boom = 0;
  jump = 0;
  collects = 9;
  globaltime = 0;
  // 03 orange red eyes
  // 04 light orange
  // 05 dark orange
  // 06 soft pink (less contrast than 08)
  // 07 light ocher
  // 08 light brown (contrast)
  // 09 violet
  // 10 grey
  // 11 green

  levels = [
    ,
    //22:boar, 24:fox<>, 26:fox>, 28:<-fox->, 30:<beaver>, 32:fox->, 34:snake>, 36:empty, 38:lion
    //[posX, posY, animation speed, color type, direction facing]
    [
      [1, 2, 40, 32, 4, 1],
      [2, 3, 15, 22, 6],
      [3, 0, 72, 24, 10],
      [4, 1, 45, 32, 5, 1],
      [5, 2, 12, 22, 8],
    ],
    [
      [1, 1, 22, 22, 4, 1],
      [3, 0, 72, 24, 10],
      [2, 2, 18, 22, 8],
      [3, 3, 35, 32, 3, 1],
      [4, 0, 58, 28, 9],
      [5, 4, 64, 24, 7],
    ],
    [
      [1, 3, 45, 28, 9],
      [3, 0, 12, 22, 3],
      [3, 2, 14, 22, 4],
      [3, 4, 13, 22, 5],
      [4, 2, 30, 34, 10],
      [5, 0, 50, 24, 8],
      [5, 3, 50, 22, 6],
    ],
    [
      [1, 3, 40, 32, 4],
      [2, 0, 12, 22, 8],
      [3, 1, 30, 34, 5],
      [3, 3, 36, 28, 9],
      [4, 2, 20, 34, 11, 1],
      [4, 0, 30, 24, 7, 1],
      [5, 0, 50, 24, 10],
      [5, 3, 50, 22, 6],
    ],
    [
      [1, 3, 55, 24, 6, 1],
      [2, 0, 60, 26, 8],
      [3, 4, 60, 34, 10],
      [3, 1, 35, 32, 3, 1],
      [4, 3, 20, 22, 7],
      [4, 1, 50, 28, 9],
      [5, 3, 100, 30, 5],
    ],
    [
      [1, 0, 40, 26, 7],
      [2, 3, 40, 34, 10],
      [2, 1, 30, 28, 9],
      [3, 0, 30, 38, 8],
      [4, 0, 0, 36],
      [4, 2, 30, 30, 11],
      [5, 1, 10, 22, 6],
      [5, 4, 50, 34, 4, 1],
    ],
    [
      [1, 2, 28, 34, 10],
      [2, 4, 36, 30, 11],
      [3, 3, 28, 30, 9],
      [3, 0, 26, 30, 8],
      [4, 0, 5, 17, 12],
      [4, 1, 4, 17, 12],
      [4, 2, 6, 17, 12],
      [4, 3, 3, 17, 12],
      [4, 4, 7, 17, 12],
      [5, 1, 28, 34, 7, 1],
      [5, 3, 40, 30, 5, 1],
    ],
    [
      [1, 0, 40, 30, 5],
      [2, 3, 40, 34, 10, 1],
      [2, 1, 40, 28, 9],
      [3, 3, 30, 38, 8],
      [4, 3, 0, 36],
      [5, 1, 10, 22, 6],
      [5, 4, 50, 34, 4, 1],
    ],
    [
      [1, 3, 60, 34, 5, 1],
      [2, 1, 20, 38, 6],
      [3, 1, 0, 36],
      [2, 3, 30, 38, 10, 1],
      [3, 3, 0, 36],
      [1, 1, 50, 34, 4],
      [4, 0, 24, 28, 9],
      [4, 1, 16, 22, 7, 1],
      [5, 1, 50, 34, 11, 1],
    ],
    [
      [1, 1, 35, 34, 6, 1],
      [1, 3, 42, 34, 10, 1],
      [2, 3, 31, 30, 5, 1],
      [3, 3, 70, 28, 9],
      [4, 3, 29, 30, 8, 1],
      [5, 0, 25, 26, 3, 1],
      [5, 2, 50, 26, 4],
    ],
    [
      [1, 0, 10, 22, 3],
      [1, 3, 17, 22, 8],
      [2, 1, 12, 22, 6],
      [2, 4, 11, 22, 10],
      [3, 2, 15, 22, 9],
      [3, 4, 13, 22, 4],
      [4, 3, 16, 22, 11],
      [4, 0, 15, 22, 5],
      [5, 4, 13, 22, 7],
    ],
    [
      [1, 3, 30, 38, 8],
      [2, 3, 0, 36],
      [1, 0, 30, 38, 5],
      [2, 0, 0, 36],
      [4, 2, 30, 38, 6],
      [5, 2, 0, 36],
      [4, 4, 30, 38, 9],
      [5, 4, 0, 36],
      [3, 1, 28, 34, 10],
      [3, 4, 25, 34, 7, 1],
    ],
    [
      [1, 3, 25, 30, 8, 1],
      [2, 0, 20, 30, 7],
      [3, 3, 50, 28, 9],
      [4, 2, 40, 34, 6],
      [4, 4, 50, 34, 10],
      [5, 1, 50, 38, 5],
      [5, 0, 50, 30, 3],
      [5, 2, 62, 30, 4],
      [3, 0, 0, 20 + mode, 1 + mode],
    ],
  ];
  speeds = [
    ,
    [-1, 1, -1, 1, -1],
    [-1.5, 1, -1, 1, -1],
    [2, -1, -1, 1.5, -1.5],
    [1.5, -1.5, 1, 1, -1.5],
    [-1, 1, -1.5, 1, -1],
    [2, -1.5, 1, 1, -2],
    [2, -1.5, 2, 30, -2],
    [1, -1.5, 1, 1, 2],
    [1.5, -1.5, -1.5, 2, -1],
    [2, -2, 1, 2, -2.5],
    [2.5, -2.5, 3, -3, 3.5],
    [1.5, 1.5, 2.5, -1.5, -1.5],
    [1.75, -1.75, 2, -2, 0],
  ];
  offsets = [
    ,
    [50, -20, -75, -60, -50],
    [40, -20, -75, -50, -75],
    [0, -50, -50, 50, 0],
    [0, 0, -50, -50, 0],
    [-25, -50, 0, 0, 0],
    [0, -50, 0, 0, 50],
    [-25, -50, 0, 0, 0],
    [0, -50, 0, 0, 50],
    [0, 0, 0, -50, 50],
    [-90, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, -50, -25, 0, -3],
  ];
  spaces = [
    ,
    [14, 14, 14, 14, 14],
    [12, 12, 14, 14, 14],
    [14, 12, 12, 13, 12],
    [14, 14, 12, 12, 10],
    [13, 12, 11, 13, 13],
    [10, 10, 10, 10, 10],
    [13, 12, 11, 9, 13],
    [10, 12, 10, 10, 11],
    [10, 8, 8, 12, 12],
    [9, 10, 12, 10, 10],
    [10, 10, 10, 10, 10],
    [9, 9, 12, 9, 9],
    [10, 8, 12, 10, 16],
  ];
  startGame();
};

function startGame() {
  console.log("[Event] Start stage " + level);
  if (time) globaltime += time;
  time = 0;
  multi = 10;
  createLevel();
  resetBunnyPosition(2, 90);
  bunnyY = board[0][2].y;
  updateBunny(mode * 6);
  requestAnimationFrame(draw);
}

function getUnit(id, clr, colors, ctx, h) {
  var unit;
  var WW = W * (id > 37 ? 2 : 1); //double
  var HH = H;
  if (!id && lives < 0) {
    // zero id is used here to get a canvas for the title text
    WW = 775;
    HH = 135;
  }
  if (!ctx) {
    unit = document.createElement("canvas");
    unit.width = WW;
    unit.height = HH + 1;
    ctx = unit.getContext("2d");
    addShadow(ctx, 1);
  }
  if (!id && lives < 0) return unit; //returning the canvas for the title text
  if (id < 0) {
    for (var y = 0; y < H / 2; y++) {
      var w =
        id == -4 && y < 4
          ? 15 - y * 4
          : id == -2 && y > H / 2 - 4
            ? 24 - (H - y)
            : id == -3
              ? 11 + Math.random() * 3
              : Math.random() * (level == 11 ? 2 : 5);
      for (var x = 0; x < W / 2 - w; x++) {
        // random ambient color generation, with regards to the current level, kind of repressenting the four seasons
        var red = 16 + level * 16 + ((Math.random() * 128) | 0);
        var green =
          (level < 8
            ? (128 - level * 8 + Math.random() * (128 + level * 16)) | 0
            : 162) -
          level * (level - 1);
        var blue = (Math.random() * (42 - level * 2)) | 0;
        if (blue < 16 && level < 9) blue = 16;
        if (level == 8 || level == 9) green = (16 + Math.random() * 64) | 0;
        if (level == 11) green = 212;
        if (level == 12) {
          green = 128 + ((Math.random() * 128) | 0);
          blue = 128 + ((Math.random() * 128) | 0);
        }
        if (red > 255 || level == 10) {
          red = level == 11 ? 0 : 255;
          green = level < 9 || level == 11 ? 0 : 255;
          blue = level > 10 ? 0 : 255;
        }
        ctx.fillStyle =
          "#" + red.toString(16) + green.toString(16) + blue.toString(16);
        ctx.fillRect(
          x * 2,
          y * 2,
          1 + Math.random() * 2,
          1 + Math.random() * 2,
        );
      }
    }
    if (!clr || level == 13) return unit;
    // generate a carrot/fish item
    id = 20 + mode;
    clr = 1 + mode;
  }
  // draw the unit
  for (k = 0; k < (h || H); k++) {
    for (l = 0; l < WW; l++) {
      if (sprites[id][k * WW + l]) {
        ctx.fillStyle =
          "#" +
          (colors || enemyColors)[clr].substr(
            6 * (sprites[id][k * WW + l] - 1),
            6,
          );
        ctx.fillRect(l, k, 1, 1);
      }
    }
  }
  addShadow(ctx);
  return unit;
}
// buffer the level
function createLevel() {
  board = [];
  while (board.length < L + 2) board.push([]);

  var tile;
  var speed, width, height, offset;
  for (i = 0; i < board.length; i++) {
    speed = speeds[level][i - 1];
    offset = offsets[level][i - 1];
    width = W + 8;
    height = H + (i && i < board.length - 1 ? spaces[level][i - 1] : 0);
    for (j = 0; j < R; j++) {
      tile = Tile.getTile(
        i,
        j,
        W,
        H,
        width,
        height,
        scale,
        speed,
        speed == speeds[level][i],
        speed == speeds[level][i - 2],
      );
      if (!i || i > L) {
        tile.addUnit(
          -1,
          0,
          0,
          0,
          getUnit(-j - 1, i && j == 2 ? 2 : 0),
          i && j == 2 ? getUnit(-j - 1) : 0,
        ); // ambient with/without an item
      } else
        for (m = 0; m < levels[level].length; m++) {
          if (levels[level][m][0] == i && levels[level][m][1] == j)
            tile.addUnit(
              // add an enemy animal
              levels[level][m][2], //frame
              levels[level][m][3], //type
              levels[level][m][4], //color
              levels[level][m][5], //dir
              getUnit(levels[level][m][3], levels[level][m][4]), //sprite1
              levels[level][m][3] == 20 || levels[level][m][3] == 21
                ? 0
                : getUnit(levels[level][m][3] + 1, levels[level][m][4]), //sprite2
            );
        }
      tile.draw(gridContext);
      board[i].push(tile);
      if (offset) tile.y += offset;
    }
  }
  drawLevel();
  drawUserInterface();
}
// draws the entire level + the ambient rear parts
function drawLevel() {
  gridContext.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
  for (i = 0; i < board.length; i++) {
    for (j = 0; j < R; j++) {
      board[i][j].draw(gridContext);
    }
  }
}

const fps = 60;
const interval = 1000 / fps;
var then = 0;

// main game loop
function draw() {
  const now = performance && performance.now ? performance.now() : Date.now();
  const delta = now - then;
  if (delta < interval) {
    requestAnimationFrame(draw);
    return;
  }
  then = now;

  if (lives < 0) return;
  time++;
  oldmulti = multi;
  multi = 1 + (((60 - time / 60) / 6) | 0);
  if (multi < 1) multi = 1;
  gridContext.clearRect(156, 0, gridCanvas.width - 320, gridCanvas.height);
  for (i = 1; i < board.length - 1; i++) {
    for (j = 0; j < R; j++) {
      board[i][j].y += board[i][j].speed;
      if (board[i][j].y > hardHeight) board[i][j].y -= board[i][j].size * R;
      else if (board[i][j].y < 0 - board[i][j].size)
        board[i][j].y += board[i][j].size * R;
    }
  }
  for (i = 1; i < board.length - 1; i++) {
    for (j = 0; j < R; j++) {
      board[i][j].draw(gridContext);
    }
  }
  if (board[posX][0].speed && !jump && !p) bunnyY += board[posX][0].speed; //move bunny vertically when not in a jump
  if (bunnyY < -40 || bunnyY > 500) killBunny();

  updatePosition(
    bunnyCanvas,
    board[posX][0].x +
      scale * 10 +
      (((jump + 1) / jumpfps) | 0) * scale * (dir || -1) * 6.4,
    bunnyY,
    dir || boom > 1 || tscore ? 1 : -1,
  );

  if (jump) {
    // bunny is flying
    if (jump < 5) {
      FX.b(jump);
      if (yum) FX.c(jump);
    }
    if (jump < 7 * jumpfps) jump++;
    if (!p) updateBunny(yum ? 13 : mode * 6 + ((jump / jumpfps) | 0));
  } else if (p) {
    p += 2;
    if (p > 2) p = 0;
    updateBunny(yum ? 12 : mode * 6 + p);
  }
  if (boom > 1) {
    // bunny is zapping an enemy
    boom--;
    if (boom == 1 && bonus) {
      score += bonus;
      bonus = 0;
      tscore = 0;
      drawUserInterface(1);
    }
    updateBunny(
      boom == 1 ? (yum ? 12 : mode * 6) : 18,
      boom > 1 ? bonus : 0,
      1,
    );
  } else if (yum > 1) {
    // bunny is eating powerup
    yum--;
    if (yum == 1 && bonus) {
      score += bonus;
      bonus = 0;
      tscore = 0;
      drawUserInterface(1);
    }
    updateBunny(yum == 1 ? 12 : 18, yum > 1 ? bonus : 0, 2);
  } else if (jump > 5 * jumpfps) {
    // bunny is landing after a jump
    jump = 0;
    p = 0;
    // check where the bunny is jumping to
    // examine a vertical line of pixels and
    // compare the colors found with all available color pallets
    // to determine where the bunny is landing
    var oldX = posX;
    posX += dir || -1;
    if (posX == L + 2) {
      // transition to next stage - next level function
      FX.d(6, 90);
      level++;
      posX = 0;
      startGame();
      return;
    }

    j = new Uint32Array(
      gridContext.getImageData(
        board[posX][0].x + scale * 30,
        bunnyY,
        1,
        100,
      ).data.buffer,
    );
    n = 0;
    m = 0;

    for (i = 0; i < j.length; i += 3) {
      if (j[i]) {
        o = j[i].toString(16); //construct color hex for comparision
        o = o.substr(6, 2) + o.substr(4, 2) + o.substr(2, 2);
        if (i > 15 + mode * 10 && i < 90 - mode * 15) {
          // check safe zone pixels (center of a platform)
          for (k = 1; k < enemyColors.length; k++) {
            if (enemyColors[k].indexOf(o) > -1 && o && !n && !m) n = k; // enemy hittest detected - jumped on an enemy
          }
        }
        if (gridColors.indexOf(o) > -1) {
          // platform hittest detected
          n = 0;
          m = board[posX][0].speed;
          // check pixels in the top and bottom zones to adjust bunny position

          if (i >= 90 - mode * 15) {
            p = 1;
            bunnyY -= (100 - i - m * (m > 0 ? 1 : 6)) | 0;
          } // legs hit
          else if (i <= 15 + mode * 10) {
            p = 1;
            bunnyY += (i + m * (m > 0 ? 6 : -1)) | 0;
          } // head hit
          else n = -1; // body hit is deadly, no adjustment
          if (p && !m) n = -1;
          jump = 5 * jumpfps - 1;
          m = 1;
          if (p || n == -1) {
            posX = oldX;
            break;
          }
        }
      }
    }
    if (!m) {
      if (posX == L + 1) {
        bunnyY = board[L + 1][2].y;
        if (!yum) {
          p = 0;
          if (board[L + 1][2].sprite2 == bunnySprites[19])
            jump = 1; //arrow hittest detected - jump to next stage
          else n = 1; //powerup hittest detected
        }
      } else if (!posX) bunnyY = board[0][2].y;
    }

    if (n) {
      // jumped on something, check below:
      if (n == 1 || n == 2 || n == 12) {
        // eat powerup
        if (level == 7 && posX == 4) {
          // jump through waterfall
          if (Math.random() > 0.6 && mode && !yum) {
            FX.p(1, 9, 40, 20);
            if (collects < 9) collects++;
            drawUserInterface();
          }
          jump = 1;
        } else {
          FX.p(1, 50, 10, 40);
          FX.p(1, 90, 8, 35, 160, 0.05);
          FX.p(0, 90, 20, 30, 320, 0.06);
          yum = 40;
          if (level == 13)
            board[posX][0].sprite1 = 0; // remove item in the last stage
          else {
            bunnyY = board[L + 1][2].y;
            dir = 0;
            bonus = 200 + level * 50;
            tscore = score;
          }
          drawLevel();
          drawUserInterface();
        }
      } else if (n > 1) {
        // zap animals
        // check animal dir to see if bunny can jump through it (fox), or if it can be zapped (red arrow <> dir)
        k = 0;
        for (i = 0; i < levels[level].length; i++) {
          if (levels[level][i][4] == n) {
            k = levels[level][i][3];
            if ((k == 28 || k == 32) && !yum) {
              j = board[levels[level][i][0]][levels[level][i][1]];
              if (dir == j.dir && j.collectible) {
                // jump through fox, take collectible
                FX.p(1, 9, 40, 20);
                j.collectible = 0;
                j.dir = j.dir ? 0 : 1;
                score += 25 * level;
                if (collects < 9) collects++;
                else score += 25 * level;
                drawUserInterface();
                jump = 1;
                break;
              }
            } else if (yum) {
              if (k == 34 || k == 38 || k == 30 || k == 28) {
                j = board[levels[level][i][0]][levels[level][i][1]];
                //(level==13 && n==5 && (board[1][3].sprite1||board[2][0].sprite1||board[3][3].sprite1||board[4][2].sprite1||board[4][4].sprite1||board[5][0].sprite1||board[5][2].sprite1))
                if (dir != j.dir && !j.collectible && level < 13) {
                  killBunny();
                  break;
                }
              }

              // todo: sound depending on n
              FX.p(0, -900, 45, 50, 0, 0.04);
              FX.p(1, -200, 15, 50);
              FX.p(2, 0, 9, 40, 250);
              FX.p(1, 20, 20, 30, 300);

              boom = 40;
              bonus = (k - 18 + level + (collects < 9 ? multi : 10)) * 20;
              console.log(bonus, k);
              tscore = score;
              m = 0;
              for (k = 1; k < board.length - 1; k++) {
                for (l = 0; l < R; l++) {
                  if (board[k][l].sprite1) {
                    if (board[k][l].color == n) {
                      board[k][l].sprite1 = 0;
                      if (level == 13 && n == 5) {
                        yum = boom = 0;
                        board[k + 1][l + 1].sprite1 = getUnit(
                          mode ? 0 : 20,
                          mode ? 0 : 3,
                          playerColors,
                        );
                        drawLevel();
                        drawUserInterface();
                        updateBunny(18, "", 1);
                        setTimeout(endGame, 900);
                        return;
                      }
                    } else if (board[k][l].type != 36 && board[k][l].type != 17)
                      m++;
                  }
                }
              }
              if (!m) {
                // stage is cleared - show arrow
                board[L + 1][2].sprite2 = bunnySprites[19];
                yum = 0;
                if (collects < 9) collects++;
                else score += 5 * level;
                drawLevel();
                drawUserInterface();
                FX.c(1, 20, 900);
                FX.c(2, 20, 900);
                FX.c(3, 20, 900);
                FX.c(4, 20, 900);
              }
              break;
            }
            k = 0;
          }
        }
        if (!k) killBunny(); // killed by enemy
      } else killBunny(); // (n == -1) - body hit
    } else {
      // (n == 0) - free jump
      if (!p) updateBunny(yum ? 12 : mode * 6 + 5);
      if (!jump) p = -1;
      drawUserInterface(1);
    }
  }
  //drawFPS();
  if (!p && yum == 1 && !jump && boom < 2) updateBunny(12);
  if (tscore || multi != oldmulti) drawUserInterface(1);
  if (running) requestAnimationFrame(draw);
  //if(running) setTimeout(function(){requestAnimationFrame(draw);},50);
}

function killBunny() {
  FX.d(0);
  FX.p(2, 200, -10);
  running = 0;
  bunnyDeath(resetBunnyFunction);
}

function bunnyDeath(_callback) {
  callback = _callback;
  bunnyDieY = bunnyY;
  dieY = m = (-9 - bunnyY / 50) | 0;
  updateBunny(18);
  requestAnimationFrame(dieAnimation);
}

function dieAnimation() {
  //drawFPS();
  bunnyDieY += dieY;
  dieY += 1;
  if (dieY == m + 1) updateBunny(mode * 6 + 1);
  if (dieY == 9) updateBunny(mode * 6 + 5);
  if (bunnyDieY > hardHeight - 200 && bunnyDieY < hardHeight && m) m = FX.b();
  updatePosition(
    bunnyCanvas,
    board[posX][0].x +
      scale * 10 +
      ((jump / jumpfps) | 0) * scale * (dir || -1) * 7.25,
    bunnyDieY,
    dir || boom > 1 ? 1 : -1,
  );
  if (bunnyDieY < hardHeight) requestAnimationFrame(dieAnimation);
  else callback();
}

function endGame(l) {
  running = 0;
  end = 1;
  drawLevel();
  drawUserInterface();
  drawUI(340, 90, 320, 320, " ");
  //drawUI(300,120,400,48,"    "+(l?"   G A M E    O V E R":mode?"S U P E R   K I T T E N":" S U P E R   B U N N Y"), 32);
  drawUI(
    300,
    120,
    400,
    48,
    "       " + (l ? "G A M E    O V E R" : "W E L L    D O N E"),
    32,
  );
  updateBunny(mode * 6);
  if (l) updatePosition(bunnyCanvas, 440, 220);
  else {
    FX.d(9, 90);
    win = 1;
    drawUI(
      mode ? 358 : 415,
      180,
      0,
      0,
      mode ? "SUPER BUNNY UNLOCKED!" : "GAME CLEARED!",
    );

    drawUI(405, 210, 0, 0, "Powerup Bonus", 24);
    l = mode ? 500 : 1000;
    drawUI(440, 236, 0, 0, (l > 500 ? "" : " ") + collects + " * " + l, 32);
    score += collects * l;

    drawUI(410, 274, 0, 0, (mode ? "Kittens" : "Bunnies") + " Bonus", 24);
    l = mode ? 1000 : 2500;
    drawUI(440, 300, 0, 0, lives + " * " + l, 32);
    score += lives * l;
  }
  if (hiscore < score) {
    hiscore = score;
    besttime = globaltime + time;
  }
  drawUI(
    360,
    350,
    280,
    48,
    (score < 1000 ? "  " : score < 10000 ? " " : "") + "     Score: " + score,
    32,
  );

  if (score > selfHighscore) {
    if (score > allHighscore) {
      allHighscore = score;
      allHighscoreName = selfNameShort;
    }
    const minutes =
      ((besttime / 3600) | 0) +
      ":" +
      addLeadingZeros((besttime / 60) % 60 | 0, 2);
    const msg =
      "Super Bunny " + selfNameShort + " scored " + score + " in " + minutes;
    webxdc.sendUpdate(
      {
        payload: { addr: webxdc.selfAddr, name: selfNameShort, score: score },
        info: msg,
        summary: allHighscore + " scored by " + allHighscoreName,
      },
      msg,
    );
  }
}

function resetBunnyFunction() {
  if (yum) {
    collects--;
    if (level == 13) {
      yum = 0;
      board[3][0].sprite1 = getUnit(mode ? 21 : 20, mode ? 2 : 3, enemyColors);
    }
    if (collects < 0) {
      collects = 0;
      yum = 0;
      lives--;
    }
  } else lives--;
  if (lives < 0) endGame(1);
  else {
    drawLevel();
    drawUserInterface();
    resetBunnyPosition();
    updateBunny(yum ? 12 : mode * 6);
    jump = 0;
    pause();
  }
}
function resetBunnyPosition(s, d) {
  posX = yum ? L + 1 : 0;
  dir = yum ? 0 : 1;
  bunnyY = board[0][2].y;
  FX.d(s || 0, d || 0);
}

function updateBunny(i, s, u, r) {
  bunnyContext.clearRect(0, 0, W, H + 1);
  bunnyContext.drawImage(bunnySprites[i], 0, 0);
  if (i == 12 || i == 13)
    bunnyContext.drawImage(
      bunnySprites[14 + mode],
      0,
      ((time / 10) | 0) % 2 ? 0 : H / 2,
      W,
      H / 2,
      0,
      (i - 6) * 2 - H / 2,
      W,
      H / 2,
    );
  if (s) {
    tscore += (s / 40) | 0;
    if (u) {
      s = u == 1 ? s.toString() : "ZAP";
      bunnyContext.fillStyle = "#fff";
      bunnyContext.font = "bold " + (u == 1 ? 7 : 8) + "px Lucida Console";
      addShadow(bunnyContext, 1, 1);
      bunnyContext.fillText(s.charAt(0), 8, 9);
      bunnyContext.fillText(s.charAt(1), 10, 15);
      bunnyContext.fillText(s.charAt(2), 12, 21);
      addShadow(bunnyContext);
    }
  }
}

function addShadow(ctx, y, x, c) {
  ctx.shadowColor = c || "#000";
  ctx.shadowOffsetY = y || 0;
  ctx.shadowOffsetX = x || 0;
}

function drawUserInterface(s) {
  if (end) {
    if (hiscore) {
      drawUI(3, 63, 88, 26, "   B E S T", 15);
      drawUI(3, 84, 88, 32);
      drawUI(42 - hiscore.toString().length * 6, 84, 0, 0, hiscore, 22, 1);
    }
  } else {
    drawUI(3, 63, 88, 26, " S C O R E", 14.5);
    drawUI(3, 84, 88, 32);
    drawUI(
      42 - (tscore || score).toString().length * 6,
      84,
      0,
      0,
      tscore || score,
      22,
      1,
    );
    drawUI(3, 120, 88, 21, " BONUS : " + (collects < 9 ? multi : 10), 13);
  }
  if (s) return;

  drawUI(862, 422, 92, 26, " P O W E R", 15);
  drawUI(834, 442, 120, 92, " ");
  addShadow(gridContext, 2, 1, "#222");
  for (i = 0; i < collects; i++)
    gridContext.drawImage(
      bunnySprites[20 + mode],
      mode * 6,
      0,
      20,
      12 - mode * 3,
      830 - mode * 2 + i * 36 - (i > 2 ? 108 * ((i / 3) | 0) : 0) + 8,
      450 + mode * 3 + (i > 2 ? 26 * ((i / 3) | 0) : 0),
      40,
      24 - mode * 6,
    );

  drawUI(3, mode ? 422 : 448, 88, 26, "  L I V E S", 15);
  drawUI(3, mode ? 442 : 468, 119, mode ? 92 : 66, " ");
  addShadow(gridContext, 0, 1, "#222");
  for (i = 0; i < lives; i++)
    gridContext.drawImage(
      bunnySprites[14 + mode],
      4,
      0,
      20,
      12,
      i * 36 - (i > 2 ? 108 * ((i / 3) | 0) : 0) + 8,
      (mode ? 452 : 478) + (i > 2 ? 26 * ((i / 3) | 0) : 0),
      40,
      24,
    );

  drawUI(monet ? 40 : 3, 8, 88, 26, " S T A G E", 15);
  drawUI(
    monet ? 40 : 3,
    28,
    88,
    32,
    "     " + (level > 9 ? "" : " ") + level,
    21,
  );

  if (document.fullscreenEnabled) {
    drawUI(874, 50, 80, 32, " Full");
    drawUI(926, 57, 18, 15, fff ? "▀" : "", 12);
    drawUI(885, 74, 10, 4);
  }

  if (monet) {
    drawUI(3, 8, 34, 29, level < 13 ? " ►" : " ▷", 18);
    drawUI(3, 40, 34, 28, level > 1 ? " ◄" : " ◁", 16);
  }

  drawUI(834, 8, 120, 32, " Sound " + (FX.volume ? " ON" : "OFF"), 19);
  drawUI(845, 32, 10, 4);
}

function drawUI(x, y, w, h, t, s, f) {
  addShadow(gridContext, 2, 2);
  if (!f && w) {
    gridContext.globalAlpha = 0.7;
    gridContext.fillStyle = "#fff";
    gridContext.fillRect(x, y, w, h);
    gridContext.clearRect(x + 5, y + 4, w - 10, h - 8);
    addShadow(gridContext);
    gridContext.globalAlpha = 0.4;
    gridContext.fillStyle = "#9b9";
    gridContext.fillRect(x + 5, y + 4, w - 10, h - 8);
    addShadow(gridContext, 2, 2);
    gridContext.globalAlpha = 1;
  }
  gridContext.fillStyle = "#fff";
  gridContext.font = "bold " + (s || 20) + "px Arial";
  gridContext.fillText(t == 0 || t ? t : "", x + 5, y + 2 + (s || 20));
  addShadow(gridContext);
}

function gameClick(e) {
  if (e.clientY / height < 0.3) return;
  if (lives < 0 && !end) startNewGame();
  else if (lives < 0 && end) resetGame();
  else if (end && level == 13) resetGame();
}
function leftClick() {
  if (jump || yum > 1 || boom > 1 || p || end || !running) return;
  if (dir) {
    FX.c(2, 9);
    dir = 0;
  } else if (posX) {
    if (posX == 1 && (bunnyY < 120 || bunnyY > 240)) {
      FX.p(1, 90, -20, 20);
    } else {
      FX.c(4);
      jump = 1;
    }
  }
}
function rightClick() {
  if (
    jump ||
    yum > 1 ||
    boom > 1 ||
    p ||
    (level == 13 && posX == 5) ||
    end ||
    !running
  )
    return;
  if (!dir) {
    FX.c(2, 9);
    dir = 1;
  } else if (posX < L + 1) {
    if (posX == L && (bunnyY < 120 || bunnyY > 240)) {
      FX.p(1, 90, -20, 20);
    } else {
      FX.c(4);
      jump = 1;
    }
  }
}
function pause() {
  fff = 0;
  drawUserInterface();
  if (lives < 0 || end) return;
  if (running) running = 0;
  else {
    running = 1;
    requestAnimationFrame(draw);
  }
}

function mute() {
  if (FX.volume) {
    FX.volume = 0;
    zzfxX.suspend();
  } else {
    FX.volume = 1;
    FX.c(3, 2);
    zzfxX.resume();
  }
  drawUserInterface();
}

function resetGame() {
  if (end && level == 13 && win) {
    master = mode + 1;
    mode = 0;
    win = 0;
    tscore = 0;
  }
  menu.style.display = "block";
  end = 0;
  running = 1;
  lives = -1;
  level = 0;
  createMenu();
}

function keyDownHandler(e) {
  //console.log(e.keyCode)
  e = e.keyCode;

  if (e == 32 || e == 13) {
    if (lives < 0 && !end) startNewGame();
    else if (lives < 0 && end) resetGame();
  }
  if (e == 39 || e == 68) {
    rightClick();
  }
  if (e == 37 || e == 65) {
    leftClick();
  }
  if (e == 83) {
    mute();
  }
  if (e == 70) {
    toggleFullscreen();
  }
  if (e == 192) {
    jump = 5 * jumpfps + 1;
    dir = 1;
    posX = L + 1;
  }
}

// FPS display
// -------------
/*const times = [];
var fps;
function drawFPS(){
  const now = performance.now();
  while (times.length > 0 && times[0] <= now - 1000) {
    times.shift();
  }
  times.push(now);
  fps = times.length;
  addShadow(gridContext, 2)
  gridContext.fillStyle = "#898";
  gridContext.fillRect(5,104,85,28)
  gridContext.font = "bold 20px Arial";
  gridContext.fillStyle = "#fff";
  gridContext.fillText("FPS: "+fps, 10, 125);
  addShadow(gridContext, 0)
}*/

// fullscreen handler
// -----------------
function toggleFullscreen(e) {
  if (document.fullscreenEnabled) {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }
}

function fullscreenCheck(e) {
  console.log(e);
  fff = document.fullscreenElement;
  drawUserInterface();
}

// for debugging
window.prevStage = () => {
  console.log("[Cheat] force previous stage");
  if (level > 1) {
    jump = 5 * jumpfps + 1;
    dir = 0;
    posX = 0;
  }
};

// for debugging
window.nextStage = () => {
  console.log("[Cheat] force next stage");
  if (level < 13) {
    jump = 5 * jumpfps + 1;
    dir = 1;
    posX = L + 1;
  }
};
