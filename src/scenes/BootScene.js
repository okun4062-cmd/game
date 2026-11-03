export function createBootScene(PhaserApi) {
  return class BootScene extends PhaserApi.Scene {
    constructor() { super('BootScene'); }
    create() {
      const { width, height } = this.scale;
      this.cameras.main.setBackgroundColor('#0b1018');
      this.add.rectangle(width/2,height/2,width-16,height-16,0x101925).setStrokeStyle(2,0x7e6646);
      this.add.text(width/2,height*.38,'NOCTURNE',{fontFamily:'monospace',fontSize:'30px',color:'#f0d49b',fontStyle:'bold',stroke:'#231b20',strokeThickness:5}).setOrigin(.5);
      this.add.text(width/2,height*.55,'ПРОБУЖДЕНИЕ МИРА…',{fontFamily:'monospace',fontSize:'9px',color:'#b7c2c5',letterSpacing:2}).setOrigin(.5);
      this.time.delayedCall(80,()=>this.scene.start('WorldScene'));
    }
  };
}
