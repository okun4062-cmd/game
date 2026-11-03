export function createBootScene(PhaserApi) {
  return class BootScene extends PhaserApi.Scene {
    constructor() { super('BootScene'); }

    create() {
      const { width, height } = this.scale;
      this.cameras.main.setBackgroundColor('#0b1018');
      this.add.rectangle(width / 2, height / 2, width, height, 0x101925).setStrokeStyle(2, 0x7e6646);
      this.add.text(width / 2, height * 0.35, 'NOCTURNE', {
        fontFamily: 'monospace', fontSize: '30px', color: '#f0d49b',
        fontStyle: 'bold', stroke: '#231b20', strokeThickness: 5
      }).setOrigin(0.5);
      this.add.text(width / 2, height * 0.51, 'ОТКРЫТЫЙ МИР · ГЛУБОКИЕ ДАНЖИ', {
        fontFamily: 'monospace', fontSize: '9px', color: '#b7c2c5', letterSpacing: 2
      }).setOrigin(0.5);
      this.add.text(width / 2, height * 0.68, 'Мир создаётся из зерна…', {
        fontFamily: 'monospace', fontSize: '9px', color: '#93d1b6'
      }).setOrigin(0.5);
    }
  };
}
