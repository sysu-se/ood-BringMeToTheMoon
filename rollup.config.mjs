import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import { writeFileSync } from 'fs';
import { spawn } from 'child_process';
import copy from 'rollup-plugin-copy';
import css from 'rollup-plugin-css-only';
import livereload from 'rollup-plugin-livereload';
import svelte from 'rollup-plugin-svelte';
import { terser } from 'rollup-plugin-terser';
import sveltePreprocess from 'svelte-preprocess';

const mode = process.env.NODE_ENV;
const production = mode === 'production';

const preprocess = sveltePreprocess({
	postcss: true,
});

export default {
	input:   'src/main.js',
	output:  {
		file:      'dist/bundle.js',
		sourcemap: !production,
		name:      'app',
		format:    'iife',
	},
	plugins: [
		copy({
			targets: [
				{ src: 'src/template.html', dest: 'dist', rename: 'index.html' },
				{ src: 'static/**/*', dest: 'dist' },
			],
		}),

		svelte({
			compilerOptions: {
				dev: !production,
			},
			preprocess,
		}),

		css({
			output: !production ? 'bundle.css' : (styles, styleNodes) => {
				for (let filename of Object.keys(styleNodes)) {
					if (filename.endsWith('App.css')) {
						writeFileSync('./dist/critical.css', styleNodes[filename]);
					}
				}
				writeFileSync('./dist/bundle.css', styles);
			},
		}),

		resolve({
			browser: true,
			dedupe:  ['svelte'],
		}),
		commonjs(),

		!production && serve(),

		!production && livereload({
			watch: ['dist/bundle.js', 'dist/bundle.css'],
		}),

		production && terser(),
	],
	watch:   {
		clearScreen: false,
	},
};

function serve() {
	let server;

	function toExit() {
		if (server) server.kill(0);
	}

	return {
		writeBundle() {
			if (server) return;
			server = spawn('npm', ['run', 'start', '--', '--dev'], {
				stdio: ['ignore', 'inherit', 'inherit'],
				shell: true,
			});

			process.on('SIGTERM', toExit);
			process.on('exit', toExit);
		},
	};
}
