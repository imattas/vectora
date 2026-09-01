/** Minimal WebGL2 helpers: program compilation with cache, fullscreen quad. */

/**
 * Shader-compile counter, read by the perf harness (scripts/perf.ts) to
 * assert that interactions like slider drags hit the program cache instead
 * of compiling. Exposed on globalThis so the harness can read it in-page.
 */
export const glStats = { compiles: 0 };
(globalThis as { __glStats?: typeof glStats }).__glStats = glStats;

export function compileProgram(gl: WebGL2RenderingContext, vert: string, frag: string): WebGLProgram {
  glStats.compiles++;
  const compile = (type: number, src: string) => {
    const sh = gl.createShader(type);
    if (!sh) throw new Error('Could not allocate a WebGL shader.');
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(sh);
      gl.deleteShader(sh);
      throw new Error(`Shader compile error: ${log}\n---\n${src}`);
    }
    return sh;
  };
  let vs: WebGLShader | null = null;
  let fs: WebGLShader | null = null;
  let prog: WebGLProgram | null = null;
  try {
    vs = compile(gl.VERTEX_SHADER, vert);
    fs = compile(gl.FRAGMENT_SHADER, frag);
    prog = gl.createProgram();
    if (!prog) throw new Error('Could not allocate a WebGL program.');
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(prog);
      throw new Error(`Program link error: ${log}`);
    }
    return prog;
  } catch (error) {
    if (prog) gl.deleteProgram(prog);
    throw error;
  } finally {
    if (vs) gl.deleteShader(vs);
    if (fs) gl.deleteShader(fs);
  }
}

/** A shared clip-space quad; every fragment-shader pass draws this. */
export function fullscreenQuad(gl: WebGL2RenderingContext): { draw(): void } {
  const vao = gl.createVertexArray();
  if (!vao) throw new Error('Could not allocate a WebGL vertex array.');
  const buf = gl.createBuffer();
  if (!buf) {
    gl.deleteVertexArray(vao);
    throw new Error('Could not allocate a WebGL buffer.');
  }
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);
  return {
    draw() {
      gl.bindVertexArray(vao);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindVertexArray(null);
    },
  };
}

export const QUAD_VERT = `#version 300 es
layout(location=0) in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

/** Cache programs by source so editing one equation doesn't recompile others. */
export class ProgramCache {
  private map = new Map<string, WebGLProgram>();
  private failed = new Set<string>();
  constructor(private gl: WebGL2RenderingContext, private onError?: (error: unknown) => void) {}
  get(vert: string, frag: string): WebGLProgram {
    const key = vert + '\0' + frag;
    let p = this.map.get(key);
    if (!p) {
      try {
        p = compileProgram(this.gl, vert, frag);
      } catch (error) {
        if (!this.failed.has(key)) {
          this.failed.add(key);
          if (this.failed.size > 64) {
            const [firstKey] = this.failed;
            this.failed.delete(firstKey);
          }
          this.onError?.(error);
        }
        throw error;
      }
      this.map.set(key, p);
      // Bound the cache; old programs are cheap to rebuild.
      if (this.map.size > 64) {
        const [firstKey] = this.map.keys();
        this.gl.deleteProgram(this.map.get(firstKey)!);
        this.map.delete(firstKey);
      }
    }
    return p;
  }
}
