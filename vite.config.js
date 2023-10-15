import {
  buildXDC,
  eruda,
  mockWebxdc,
  //  legacy, // causes problems with worker
} from "webxdc-vite-plugins";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [buildXDC({outFileName: "super-bunny.xdc"}), eruda(), mockWebxdc()],
});
