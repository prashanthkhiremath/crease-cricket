// audio.js — generated from the prototype; edit freely.

// ================= audio =================
const Snd = {
  ctx:null, on:true, master:null, nbuf:null,
  init(){
    if(this.ctx) return;
    try{
      const AC = window.AudioContext||window.webkitAudioContext; this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = .8; this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate*2, b = this.ctx.createBuffer(1,len,this.ctx.sampleRate), d=b.getChannelData(0);
      for(let i=0;i<len;i++) d[i]=Math.random()*2-1;
      this.nbuf=b;
      const src=this.ctx.createBufferSource(); src.buffer=b; src.loop=true;
      const f=this.ctx.createBiquadFilter(); f.type='bandpass'; f.frequency.value=700; f.Q.value=.6;
      const g=this.ctx.createGain(); g.gain.value=.035; src.connect(f); f.connect(g); g.connect(this.master); src.start();
    }catch(e){ this.ctx=null; }
  },
  noise(dur,freq,q,gain,attack=.002){
    if(!this.ctx||!this.on) return;
    const t=this.ctx.currentTime, s=this.ctx.createBufferSource(); s.buffer=this.nbuf;
    const f=this.ctx.createBiquadFilter(); f.type='bandpass'; f.frequency.value=freq; f.Q.value=q;
    const g=this.ctx.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(gain,t+attack); g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t, Math.random()); s.stop(t+dur+.05);
  },
  tone(freq,dur,gain,type='triangle'){
    if(!this.ctx||!this.on) return;
    const t=this.ctx.currentTime,o=this.ctx.createOscillator(),g=this.ctx.createGain();
    o.type=type; o.frequency.setValueAtTime(freq,t); o.frequency.exponentialRampToValueAtTime(freq*.6,t+dur);
    g.gain.setValueAtTime(gain,t); g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t+dur+.02);
  },
  bat(p){ this.tone(820,.09,.35*p+.1); this.noise(.06,2400,1.2,.5*p+.15); },
  stumps(){ this.noise(.25,1400,2,.6); this.tone(500,.15,.2,'square'); },
  cheer(l){ this.noise(2.4*l+.6,900,.5,.25*l+.05,.25); this.noise(1.8*l+.4,1800,.7,.12*l,.3); },
  groan(){ this.noise(1.2,400,.8,.18,.2); },
};

export { Snd };
