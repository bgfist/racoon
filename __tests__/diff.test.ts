import { diff, arrayDiff, applyPatch, applyArrayPatch, PatchType } from '../src/diff'

describe('diff value', () => {
  test('both value', () => {
    const lhs = 1
    const rhs = 2
    expect(diff(lhs, rhs)).toEqual([[PatchType.OBJ_ASSIGN, 2]])
    expect(applyPatch(lhs, diff(lhs, rhs))).toEqual(rhs)
  })

  test('lhs not value', () => {
    const lhs = { name: 'jack' }
    const rhs = 'jack'
    expect(diff(lhs, rhs)).toEqual([[PatchType.OBJ_ASSIGN, 'jack']])
    expect(applyPatch(lhs, diff(lhs, rhs))).toEqual(rhs)
  })

  test('rhs not value', () => {
    const lhs = 'jack'
    const rhs = { name: 'jack' }
    expect(diff(lhs, rhs)).toEqual([[PatchType.OBJ_ASSIGN, { name: 'jack' }]])
    expect(applyPatch(lhs, diff(lhs, rhs))).toEqual(rhs)
  })
})

describe('diff array', () => {
  const a = { name: 'jack' }
  const b = { name: 'rose' }
  const c = { name: 'ming' }

  test('throws when rhs not array', () => {
    const lhs = [a, b, c]
    const rhs: any = { a }
    const fn = () => diff(lhs, rhs)
    expect(fn).toThrow('diff rhs not Array')
  })

  test('move single', () => {
    const lhs = [a, b, c]
    const rhs = [c, b, c]
    expect(arrayDiff(lhs, rhs)).toEqual([[PatchType.ARR_MOVE, 0, 2, 1]])
    expect(applyArrayPatch(lhs, arrayDiff(lhs, rhs))).toEqual(rhs)
  })

  test('move multiple', () => {
    const lhs = [a, b, c]
    const rhs = [b, c, c]
    expect(arrayDiff(lhs, rhs)).toEqual([[PatchType.ARR_MOVE, 0, 1, 2]])
    expect(applyArrayPatch(lhs, arrayDiff(lhs, rhs))).toEqual(rhs)
  })

  test('add single', () => {
    const lhs = [a, b, c]
    const rhs = [a, b, c, 1]
    expect(arrayDiff(lhs, rhs)).toEqual([[PatchType.ARR_ADD, 3, [[PatchType.OBJ_ASSIGN, 1]]]])
    expect(applyArrayPatch(lhs, arrayDiff(lhs, rhs))).toEqual(rhs)
  })

  test('add multiple', () => {
    const lhs = [a, b, c]
    const rhs = [a, b, c, 1, 2]
    expect(arrayDiff(lhs, rhs)).toEqual([[PatchType.ARR_ADD, 3, [[PatchType.OBJ_ASSIGN, 1]], [[PatchType.OBJ_ASSIGN, 2]]]])
    expect(applyArrayPatch(lhs, arrayDiff(lhs, rhs))).toEqual(rhs)
  })

  test('del', () => {
    const lhs = [a, b, c]
    const rhs = [a, b]
    expect(arrayDiff(lhs, rhs)).toEqual([[PatchType.ARR_DEL, 2]])
    expect(applyArrayPatch(lhs, arrayDiff(lhs, rhs))).toEqual(rhs)
  })

  test('mixed', () => {
    const lhs = [a, b, c, a, b, c]
    const rhs = [1, a, b, 2, c]
    expect(applyArrayPatch(lhs, arrayDiff(lhs, rhs))).toEqual(rhs)
  })
})

describe('diff object', () => {
  test('retain', () => {
    const lhs = {
      name: 'jack',
      age: 20,
      avatar: '...'
    }
    const rhs = {
      name: 'jack'
    }
    expect(diff(lhs, rhs)).toEqual([[PatchType.OBJ_RETAIN, 'name']])
    expect(applyPatch(lhs, diff(lhs, rhs))).toEqual(rhs)
  })

  test('del', () => {
    const lhs = {
      name: 'jack',
      age: 20,
      avatar: '...'
    }
    const rhs = {
      name: 'jack',
      age: 20
    }
    expect(diff(lhs, rhs)).toEqual([[PatchType.OBJ_DEL, 'avatar']])
    expect(applyPatch(lhs, diff(lhs, rhs))).toEqual(rhs)
  })

  test('assign', () => {
    const lhs = {
      name: 'jack',
      age: 20,
      avatar: '...'
    }
    const rhs = {
      name: 'jack',
      age: 20,
      avatar: 'newAvatar'
    }
    expect(diff(lhs, rhs)).toEqual([[PatchType.OBJ_ASSIGN, { avatar: 'newAvatar' }]])
    expect(applyPatch(lhs, diff(lhs, rhs))).toEqual(rhs)
  })

  test('single assign merge up', () => {
    const lhs = {
      a: {
        b: 1
      }
    }
    const rhs = {
      a: {
        b: 2
      }
    }
    expect(diff(lhs, rhs)).toEqual([[PatchType.OBJ_ASSIGN, { a: { b: 2 } }]])
    expect(applyPatch(lhs, diff(lhs, rhs))).toEqual(rhs)
  })

  test('key', () => {
    const lhs = {
      a: {
        b: 1,
        c: 0
      }
    }
    const rhs = {
      a: {
        b: 2
      }
    }
    expect(diff(lhs, rhs)).toEqual([
      [
        PatchType.OBJ_KEY,
        {
          a: [[PatchType.OBJ_RETAIN], [PatchType.OBJ_ASSIGN, { b: 2 }]]
        }
      ]
    ])
    expect(applyPatch(lhs, diff(lhs, rhs))).toEqual(rhs)
  })

  test('mixed', () => {
    const lhs = {
      a: {
        b: {
          say: 'hello world'
        },
        c: 0
      },
      b: {
        a: 'uzi',
        b: false
      },
      c: 'jack'
    }
    const rhs = {
      a: {
        c: 100
      },
      c: '???',
      d: 'what?'
    }
    expect(applyPatch(lhs, diff(lhs, rhs))).toEqual(rhs)
  })
})

describe('diff mixed', () => {
  test('arr with obj diff', () => {
    const a = { name: 'jack' }
    const b = { name: 'rose' }
    const c = { name: 'ming' }

    const lhs = [a, b, c]
    const rhs = [{ name: 'uzi' }, { age: 20 }, b]
    expect(applyPatch(lhs, diff(lhs, rhs))).toEqual(rhs)
  })

  test('obj with arr diff', () => {
    const a = { name: 'jack' }
    const b = { name: 'rose' }
    const c = { name: 'ming' }
    const lhs = {
      a: [a, b, c],
      b: {
        c: 'hello world'
      }
    }
    const rhs = {
      a: [{ name: 'uzi' }, { age: 20 }, b],
      b: {
        c: { d: 1 }
      }
    }
    expect(applyPatch(lhs, diff(lhs, rhs))).toEqual(rhs)
  })
})
