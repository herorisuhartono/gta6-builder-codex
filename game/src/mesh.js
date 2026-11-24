const corners = [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]];
const faces = [[0,1,2,3],[5,4,7,6],[4,0,3,7],[1,5,6,2],[3,2,6,7],[4,5,1,0]];
const shade = [.76,.91,.69,.85,1,.58];

export function rgb(hex) {
  const n = Number.parseInt(hex, 16);
  return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export class Mesh {
  data = [];

  triangle(a,b,c,color,light=1) {
    for (const point of [a,b,c]) this.data.push(...point, ...color.map(value => value * light));
  }

  quad(a,b,c,d,color,light=1) {
    this.triangle(a,b,c,color,light);
    this.triangle(a,c,d,color,light);
  }

  box(x,y,z,w,h,d,color,yaw=0,roll=0,pitch=0) {
    const cs = Math.cos(yaw), sn = Math.sin(yaw);
    const cr = Math.cos(roll), sr = Math.sin(roll);
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const points = corners.map(([px,py,pz]) => {
      const u = px*w/2, v = py*h/2, t = pz*d/2;
      const a = u*cr-v*sr, b = u*sr+v*cr;
      const f = t*cp+b*sp;
      return [x+a*cs+f*sn,y+b*cp-t*sp,z+f*cs-a*sn];
    });
    faces.forEach(([a,b,c,d],i) => this.quad(points[a],points[b],points[c],points[d],color,shade[i]));
  }
}
