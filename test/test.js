import assert from 'assert';
import Lab from 'lab';

export const lab = Lab.script();

lab.experiment('A test', () => {
  lab.test('should pass', done => {
    assert.ok(true, 'Breaking it softly');
    done();
  });
});
