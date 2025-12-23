export const API = {
    TESTCOMMAND: 1
    
}


export const API_BY_VALUE = Object.entries(API).reduce((acc, [key, value]) => {
  acc[value] = key
  return acc
}, {})