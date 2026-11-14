import type { ViewState } from '../../view-state';
export function pan(view: Readonly<ViewState>, dx: number, dy: number, width: number): ViewState {
  const factor = Math.min(180, view.fov) * Math.PI / (180 * Math.max(1, width));
  const a=view.ra*Math.PI/180, d=view.dec*Math.PI/180;
  const center=[Math.cos(d)*Math.cos(a),Math.cos(d)*Math.sin(a),Math.sin(d)];
  const east=[-Math.sin(a),Math.cos(a),0], north=[-Math.sin(d)*Math.cos(a),-Math.sin(d)*Math.sin(a),Math.cos(d)];
  const magnitude=Math.hypot(dx,dy);
  if (magnitude===0) return {...view};
  const angle=magnitude*factor, s=Math.sin(angle)/magnitude, c=Math.cos(angle);
  const x=c*center[0]+s*(dx*east[0]+dy*north[0]);
  const y=c*center[1]+s*(dx*east[1]+dy*north[1]);
  const z=c*center[2]+s*(dx*east[2]+dy*north[2]);
  return {...view,ra:(Math.atan2(y,x)*180/Math.PI+360)%360,dec:Math.asin(Math.max(-1,Math.min(1,z)))*180/Math.PI};
}
export function zoom(view: Readonly<ViewState>, factor: number): ViewState {
  return { ...view, fov: Math.max(0.05, Math.min(360, view.fov * factor)) };
}
