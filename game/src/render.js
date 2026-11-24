const vertex = `
attribute vec3 position;
attribute vec3 pigment;
uniform vec3 eye, right, up, forward;
uniform float aspect;
varying vec3 color;
varying float depth;
void main() {
  vec3 q=position-eye;
  float z=dot(q,forward);
  gl_Position=vec4(dot(q,right)*1.48/aspect,dot(q,up)*1.48,z*1.00022-.16,z);
  color=pigment;
  depth=z;
}`;
const fragment = `
precision mediump float;
varying vec3 color;
varying float depth;
void main() {
  gl_FragColor=vec4(mix(color,vec3(.79,.48,.55),smoothstep(65.,550.,depth)*.76),1.);
}`;
const cross = ([a,b,c],[x,y,z]) => [b*z-c*y,c*x-a*z,a*y-b*x];
const normalized = (v) => {
  const length = Math.hypot(...v);
  return v.map(n => n / length);
};

export function createRenderer(canvas, world) {
  const gl = canvas.getContext('webgl', { antialias: true, alpha: true });
  if (!gl) throw new Error('Marrow Bay requires WebGL.');
  const program = gl.createProgram();
  for (const [kind,source] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]) {
    const shader = gl.createShader(kind);
    gl.shaderSource(shader,source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    gl.attachShader(program,shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  const position = gl.getAttribLocation(program,'position');
  const pigment = gl.getAttribLocation(program,'pigment');
  const uniforms = Object.fromEntries(['eye','right','up','forward','aspect'].map(name => [name,gl.getUniformLocation(program,name)]));
  const stationary = gl.createBuffer();
  const moving = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,stationary);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(world.data),gl.STATIC_DRAW);
  gl.enableVertexAttribArray(position);
  gl.enableVertexAttribArray(pigment);
  gl.enable(gl.DEPTH_TEST);

  function draw(buffer,count) {
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.vertexAttribPointer(position,3,gl.FLOAT,false,24,0);
    gl.vertexAttribPointer(pigment,3,gl.FLOAT,false,24,12);
    gl.drawArrays(gl.TRIANGLES,0,count/6);
  }

  return function render(camera, dynamic) {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0,0,width,height);
    }
    gl.clearColor(0,0,0,0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const forward = normalized(camera.target.map((n,i) => n-camera.eye[i]));
    const right = normalized(cross([0,1,0],forward));
    const up = cross(forward,right);
    gl.uniform3fv(uniforms.eye,camera.eye);
    gl.uniform3fv(uniforms.right,right);
    gl.uniform3fv(uniforms.up,up);
    gl.uniform3fv(uniforms.forward,forward);
    gl.uniform1f(uniforms.aspect,width/Math.max(1,height));
    draw(stationary,world.data.length);
    gl.bindBuffer(gl.ARRAY_BUFFER,moving);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(dynamic.data),gl.STREAM_DRAW);
    draw(moving,dynamic.data.length);
  };
}
