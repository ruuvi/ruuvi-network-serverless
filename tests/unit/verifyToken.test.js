const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2MDE2NDUyMDUsImlhdCI6MTYwMTY0NDMwNSwiZGF0YSI6eyJlbWFpbCI6ImF3d3dpbkBnbWFpbC5jb20iLCJ0eXBlIjoicmVzZXQifX0.LIsTEhO5XZOVVUBqXrwsHwg1vySIFP848ovMX_p4e8k';
const secret = '6AGHfcqXM1IcsyrdaElWqLsWZKmg39ovSaKiVsi2Ex6cZjqCZ8ioJlATcM3CT6aE';
const jwt = require('jsonwebtoken')

test('verify throws on expired token', () => {
	expect(() => {
		jwt.verify(token, secret)
	}).toThrow();
})
