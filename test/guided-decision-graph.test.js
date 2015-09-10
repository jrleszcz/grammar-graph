var test = require('tape')
var DecisionGraph = require('../lib/decision-graph.js')
var GuidedDecisionGraph = require('../lib/guided-decision-graph.js')
var GrammarGraph = require('../lib/grammar-graph.js')

test('GuidedDecisionGraph methods', function (t) {
  var dg = new DecisionGraph()

  var ANDs = ['Sentence', '_NounPhrase_1', '_NounPhrase_2', '_VerbPhrase_1',
              'RelativeClause', 'the', 'that', 'dog', 'cat', 'bird', 'squirrel',
              'befriended', 'loved', 'ate', 'attacked']
  var ORs = ['NounPhrase', 'VerbPhrase', 'Noun', 'Verb']

  ANDs.forEach(function (andVertex) {
    dg.addVertexAND(andVertex)
  })

  ORs.forEach(function (orVertex) {
    dg.addVertexOR(orVertex)
  })

  dg.addEdge('Sentence', ['NounPhrase', 'VerbPhrase'])
  dg.addEdge('NounPhrase', ['_NounPhrase_1', '_NounPhrase_2'])
  dg.addEdge('VerbPhrase', ['Verb', '_VerbPhrase_1'])
  dg.addEdge('_NounPhrase_1', ['the', 'Noun'])
  dg.addEdge('_NounPhrase_2', ['the', 'Noun', 'RelativeClause'])
  dg.addEdge('_VerbPhrase_1', ['Verb', 'NounPhrase'])
  dg.addEdge('RelativeClause', ['that', 'VerbPhrase'])
  dg.addEdge('Noun', ['dog', 'cat', 'squirrel', 'bird'])
  dg.addEdge('Verb', ['befriended', 'loved', 'ate', 'attacked'])

  t.equal(dg.V(), 19)

  t.throws(function () {
      var a = new GuidedDecisionGraph(dg)
      a // Standard is complaining that a is defined and not used
    }, Error)
  t.throws(function () {
      var a = new GuidedDecisionGraph(dg)
      a
    }, Error)

  var guide = new GuidedDecisionGraph(dg, 'Sentence')
  t.deepEqual(guide.construction(), [])
  t.deepEqual(guide.choices(), ['the'])
  t.false(guide.isComplete())
  t.throws(function () {guide.pop()}, Error,
    'Should not be able to pop empty construction')
  t.deepEqual(guide.constructs(),
    ['the Noun RelativeClause VerbPhrase',
     'the Noun VerbPhrase'])

  guide.choose('the')
  t.deepEqual(guide.construction(), ['the'])
  t.deepEqual(guide.choices().sort(), ['dog', 'cat', 'squirrel', 'bird'].sort())
  t.false(guide.isComplete())
  t.deepEqual(guide.constructs(),
    [ 'the bird RelativeClause VerbPhrase',
      'the bird VerbPhrase',
      'the cat RelativeClause VerbPhrase',
      'the cat VerbPhrase',
      'the dog RelativeClause VerbPhrase',
      'the dog VerbPhrase',
      'the squirrel RelativeClause VerbPhrase',
      'the squirrel VerbPhrase' ])

  guide.choose('dog')
  t.deepEqual(guide.construction(), ['the', 'dog'])
  t.deepEqual(guide.choices().sort(),
    ['befriended', 'loved', 'attacked', 'ate', 'that'].sort())
  t.deepEqual(guide.constructs(),
    [ 'the dog ate',
      'the dog ate NounPhrase',
      'the dog attacked',
      'the dog attacked NounPhrase',
      'the dog befriended',
      'the dog befriended NounPhrase',
      'the dog loved',
      'the dog loved NounPhrase',
      'the dog that VerbPhrase VerbPhrase' ])

  guide.choose('ate')
  t.deepEqual(guide.construction(), ['the', 'dog', 'ate'])
  t.deepEqual(guide.choices().sort(),
    ['', 'the'].sort())
  t.deepEqual(guide.constructs(),
    [ 'the dog ate',
      'the dog ate the Noun',
      'the dog ate the Noun RelativeClause' ])

  t.equal(guide.pop(), 'ate')
  t.deepEqual(guide.construction(), ['the', 'dog'])
  t.deepEqual(guide.choices().sort(),
    ['befriended', 'loved', 'attacked', 'ate', 'that'].sort())

  guide.choose('ate')
  t.deepEqual(guide.construction(), ['the', 'dog', 'ate'])
  t.deepEqual(guide.choices().sort(),
    ['', 'the'].sort())

  guide.choose('the')
  t.deepEqual(guide.construction(), ['the', 'dog', 'ate', 'the'])
  t.deepEqual(guide.choices().sort(),
    ['dog', 'cat', 'squirrel', 'bird'].sort())

  ;'cat that ate the bird that attacked the squirrel'.split(' ').forEach(function (t) {
    guide.choose(t)
  })

  t.equal(guide.construction().join(' '),
    'the dog ate the cat that ate the bird that attacked the squirrel')

  // throws errors when given a terminal which is not a valid next choice
  t.throws(function () {guide.choose('the')}, Error)
  t.throws(function () {guide.choose(' ')}, Error)

  t.equal(guide.pop(), 'squirrel')
  t.equal(guide.pop(), 'the')
  t.deepEqual(guide.choices().sort(),
    ['the', ''].sort())

  guide.choose('')
  t.deepEqual(guide.choices(), [])
  t.true(guide.isComplete())
  t.deepEqual(guide.constructs(),
    ['the dog ate the cat that ate the bird that attacked'])

  t.end()
})

test('GuidedDecisionGraph nDeep choices', function (t) {
  var g = {
    Sentence: ['NounPhrase VerbPhrase'],
    NounPhrase: ['the Noun', 'the Noun RelativeClause'],
    VerbPhrase: ['Verb', 'Verb NounPhrase'],
    RelativeClause: ['that VerbPhrase'],
    Noun: ['dog', 'cat', 'bird', 'squirrel'],
    Verb: ['befriended', 'loved', 'ate', 'attacked']
  }
  var graph = new GrammarGraph(g)
  var guide = graph.guide('Sentence')

  t.deepEqual(guide.choices(), ['the'])
  t.deepEqual(guide.choices(1), ['the'])
  t.deepEqual(guide.choices(2).sort(),
    [['the', 'dog'], ['the', 'cat'], ['the', 'squirrel'], ['the', 'bird']].sort())
  guide.choose('the')
  guide.choose('dog')
  guide.choose('ate')
  t.deepEqual(guide.choices(3).sort(),
    [ [ '' ],
      [ 'the', 'squirrel', 'that' ],
      [ 'the', 'squirrel', '' ],
      [ 'the', 'bird', 'that' ],
      [ 'the', 'bird', '' ],
      [ 'the', 'cat', 'that' ],
      [ 'the', 'cat', '' ],
      [ 'the', 'dog', 'that' ],
      [ 'the', 'dog', '' ] ].sort())

  t.deepEqual(guide.choices(5).sort(),
    [ [ '' ],
      [ 'the', 'squirrel', 'that', 'attacked', '' ],
      [ 'the', 'squirrel', 'that', 'attacked', 'the' ],
      [ 'the', 'squirrel', 'that', 'ate', '' ],
      [ 'the', 'squirrel', 'that', 'ate', 'the' ],
      [ 'the', 'squirrel', 'that', 'loved', '' ],
      [ 'the', 'squirrel', 'that', 'loved', 'the' ],
      [ 'the', 'squirrel', 'that', 'befriended', '' ],
      [ 'the', 'squirrel', 'that', 'befriended', 'the' ],
      [ 'the', 'squirrel', '' ],
      [ 'the', 'bird', 'that', 'attacked', '' ],
      [ 'the', 'bird', 'that', 'attacked', 'the' ],
      [ 'the', 'bird', 'that', 'ate', '' ],
      [ 'the', 'bird', 'that', 'ate', 'the' ],
      [ 'the', 'bird', 'that', 'loved', '' ],
      [ 'the', 'bird', 'that', 'loved', 'the' ],
      [ 'the', 'bird', 'that', 'befriended', '' ],
      [ 'the', 'bird', 'that', 'befriended', 'the' ],
      [ 'the', 'bird', '' ],
      [ 'the', 'cat', 'that', 'attacked', '' ],
      [ 'the', 'cat', 'that', 'attacked', 'the' ],
      [ 'the', 'cat', 'that', 'ate', '' ],
      [ 'the', 'cat', 'that', 'ate', 'the' ],
      [ 'the', 'cat', 'that', 'loved', '' ],
      [ 'the', 'cat', 'that', 'loved', 'the' ],
      [ 'the', 'cat', 'that', 'befriended', '' ],
      [ 'the', 'cat', 'that', 'befriended', 'the' ],
      [ 'the', 'cat', '' ],
      [ 'the', 'dog', 'that', 'attacked', '' ],
      [ 'the', 'dog', 'that', 'attacked', 'the' ],
      [ 'the', 'dog', 'that', 'ate', '' ],
      [ 'the', 'dog', 'that', 'ate', 'the' ],
      [ 'the', 'dog', 'that', 'loved', '' ],
      [ 'the', 'dog', 'that', 'loved', 'the' ],
      [ 'the', 'dog', 'that', 'befriended', '' ],
      [ 'the', 'dog', 'that', 'befriended', 'the' ],
      [ 'the', 'dog', '' ] ].sort())

  t.end()
})
