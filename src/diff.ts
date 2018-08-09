/**
 * 使用此算法的限制：
 * 1. 仅支持6种基本数据类型：string number null boolean object array
 * 2. 不能用undefined类型，因为json不支持，可以用null
 * 3. Date类型不支持，如果需要可以用时间戳代替
 */
// @ts-ignore
// tslint:disable-next-line
import Map = require('core-js/library/fn/map')

export const enum PatchType {
  ARR_MOVE,
  ARR_ADD,
  ARR_DEL,
  OBJ_KEY,
  OBJ_ASSIGN,
  OBJ_RETAIN,
  OBJ_DEL
}

type ARR_MOVE = [PatchType.ARR_MOVE, ...number[]]
type ARR_ADD = [PatchType.ARR_ADD, number, ...any[]]
type ARR_DEL = [PatchType.ARR_DEL, number]
type OBJ_KEY = [PatchType.OBJ_KEY, any]
type OBJ_ASSIGN = [PatchType.OBJ_ASSIGN, any]
type OBJ_RETAIN = [PatchType.OBJ_RETAIN, ...string[]]
type OBJ_DEL = [PatchType.OBJ_DEL, ...string[]]

type Patch = ARR_MOVE | ARR_ADD | ARR_DEL | OBJ_KEY | OBJ_ASSIGN | OBJ_RETAIN | OBJ_DEL

const isObject = (o: any) => o != null && typeof o === 'object'
const isEmpty = (o: any) => isObject(o) && Object.keys(o).length === 0
const isSingleAssign = (patches: Patch[]) => patches.length === 1 && patches[0][0] === PatchType.OBJ_ASSIGN

export function diff(lhs: any, rhs: any): Patch[] {
  if (lhs === rhs) {
    return []
  }

  if (!isObject(lhs) || !isObject(rhs)) {
    return [[PatchType.OBJ_ASSIGN, rhs]]
  }

  if (lhs instanceof Array) {
    if (!(rhs instanceof Array)) {
      throw new Error('diff rhs not Array')
    }
    return arrayDiff(lhs, rhs)
  }

  const patches: Patch[] = []
  const retains: string[] = []
  const dels: string[] = []
  const assigns: any = {}
  const keys: any = {}

  Object.keys(lhs).forEach(key => {
    if (rhs[key] === undefined) {
      dels.push(key)
    }
  })

  Object.keys(rhs).forEach(key => {
    if (lhs[key] === undefined) {
      assigns[key] = rhs[key]
    } else {
      const difference = diff(lhs[key], rhs[key])
      if (!isEmpty(difference)) {
        if (isSingleAssign(difference)) {
          assigns[key] = difference[0][1]
        } else {
          keys[key] = difference
        }
      } else {
        retains.push(key)
      }
    }
  })

  if (!isEmpty(dels)) {
    if (retains.length < dels.length) {
      patches.push([PatchType.OBJ_RETAIN, ...retains])
    } else {
      patches.push([PatchType.OBJ_DEL, ...dels])
    }
  }

  if (!isEmpty(assigns)) {
    patches.push([PatchType.OBJ_ASSIGN, assigns])
  }
  if (!isEmpty(keys)) {
    patches.push([PatchType.OBJ_KEY, keys])
  }

  return patches
}

export function applyPatch(lhs: any, patches: Patch[]) {
  if (isSingleAssign(patches)) {
    const assign = patches[0][1]
    if (!isObject(lhs) || !isObject(assign)) {
      return assign
    }
  }

  if (lhs instanceof Array) {
    return applyArrayPatch(lhs, patches)
  }

  const rhs = { ...lhs }

  patches.forEach(patch => {
    switch (patch[0]) {
      case PatchType.OBJ_RETAIN:
        const [, ...retains] = patch
        const retainKeys = retains.reduce((obj, key) => {
          obj[key] = true
          return obj
        }, {})
        Object.keys(rhs).forEach(key => {
          if (!retainKeys[key]) {
            delete rhs[key]
          }
        })
        break
      case PatchType.OBJ_DEL:
        const [, ...dels] = patch
        dels.forEach(key => {
          delete rhs[key]
        })
        break
      case PatchType.OBJ_ASSIGN:
        const [, assign] = patch
        Object.keys(assign).forEach(key => {
          rhs[key] = assign[key]
        })
        break
      case PatchType.OBJ_KEY:
        const [, morePatches] = patch
        Object.keys(morePatches).forEach(key => {
          rhs[key] = applyPatch(lhs[key], morePatches[key])
        })
        break
      default:
        throw new Error(`bad obj patch: ${patch}`)
    }
  })

  return rhs
}

type IExchange = [number, number]
type IAugment = any

function calcAugments(augments: IAugment[], patches: Patch[]) {
  let startIndex: number
  let lastIndex: number

  augments.push(undefined) // 加一个元素让计算能完成
  augments.forEach((ele, newIndex) => {
    if (startIndex === undefined) {
      startIndex = newIndex
    } else if (ele === undefined || newIndex !== lastIndex + 1) {
      patches.push([PatchType.ARR_ADD, startIndex, ...augments.slice(startIndex, lastIndex + 1)])
      startIndex = newIndex
    }
    lastIndex = newIndex
  })
}

function calcExchanges(exchanges: IExchange[], patches: Patch[]) {
  let starter: {
    newIndex: number
    oldIndex: number
  }
  let lastIndex: number
  const moves: number[] = []

  exchanges.push([0, 0]) // 加一个元素让计算能完成
  exchanges.forEach(([newIndex, oldIndex], index) => {
    if (!starter) {
      starter = { newIndex, oldIndex }
    } else if (newIndex !== lastIndex + 1 || newIndex - oldIndex !== starter.newIndex - starter.oldIndex || index === exchanges.length - 1) {
      const count = lastIndex - starter.newIndex + 1
      moves.push(starter.newIndex, starter.oldIndex, count)
      starter = { newIndex, oldIndex }
    }
    lastIndex = newIndex
  })
  if (!isEmpty(moves)) {
    patches.push([PatchType.ARR_MOVE, ...moves])
  }
}

export function arrayDiff(lhs: any[], rhs: any[]): Patch[] {
  const patches: Patch[] = []
  const exchanges: IExchange[] = []
  const augments: IAugment[] = []
  const lmap = new Map(lhs.map((value, index) => [value, index] as [any, number]))

  rhs.forEach((ele, newIndex) => {
    const oldIndex = lmap.get(ele)
    if (oldIndex !== undefined) {
      if (oldIndex !== newIndex) {
        exchanges.push([newIndex, oldIndex])
      }
    } else {
      augments[newIndex] = diff(lhs[newIndex], ele)
    }
  })

  calcExchanges(exchanges, patches)
  calcAugments(augments, patches)
  if (rhs.length < lhs.length) {
    patches.push([PatchType.ARR_DEL, rhs.length])
  }
  return patches
}

export function applyArrayPatch(lhs: any[], patches: Patch[]) {
  const newArr = lhs.slice()

  patches.forEach(patch => {
    switch (patch[0]) {
      case PatchType.ARR_MOVE:
        const [, ...moves] = patch
        let moveOp: number[] = []
        moves.forEach((move, i) => {
          moveOp.push(move)
          if (i % 3 === 2) {
            for (let j = 0; j < moveOp[2]; j++) {
              newArr[moveOp[0] + j] = lhs[moveOp[1] + j]
            }
            moveOp = []
          }
        })
        break
      case PatchType.ARR_ADD:
        const [, newIndex, ...items] = patch
        items.forEach((item, i) => {
          newArr[newIndex + i] = applyPatch(lhs[newIndex + i], item)
        })
        break
      case PatchType.ARR_DEL:
        const [, newLength] = patch
        newArr.splice(newLength)
        break
      default:
        throw new Error(`bad arr patch: ${patch}`)
    }
  })
  return newArr
}
