import {should, suite, test} from './utility';
import {expect} from 'chai';
import {Method, MethodAlias, normalizeMethod} from '../../src/shared/method';

should;
@suite class NormalizeMethodUnitTests {
    @test 'every REP method normalizes to itself'() {
        for (const method of Object.values(Method))
            expect(normalizeMethod(method)).to.equal(method);
    }

    @test 'every HTTP alias normalizes to its REP method'() {
        for (const [alias, method] of Object.entries(MethodAlias))
            expect(normalizeMethod(alias)).to.equal(method);
    }

    @test 'lowercase and mixed-case input normalizes the same as uppercase'() {
        expect(normalizeMethod('get')).to.equal(Method.GET);
        expect(normalizeMethod('Put')).to.equal(Method.CREATE);
        expect(normalizeMethod('pAtCh')).to.equal(Method.UPDATE);
    }

    @test 'REPLY is not a valid inbound method'() {
        expect(normalizeMethod('REPLY')).to.be.null;
    }

    @test 'unrelated HTTP verbs are not valid'() {
        expect(normalizeMethod('OPTIONS')).to.be.null;
        expect(normalizeMethod('TRACE')).to.be.null;
        expect(normalizeMethod('HEAD')).to.be.null;
    }

    @test 'empty and whitespace-padded strings are invalid'() {
        expect(normalizeMethod('')).to.be.null;
        expect(normalizeMethod(' GET ')).to.be.null;
    }

    @test 'non-string input is invalid'() {
        expect(normalizeMethod(null as any)).to.be.null;
        expect(normalizeMethod(undefined as any)).to.be.null;
        expect(normalizeMethod(123 as any)).to.be.null;
        expect(normalizeMethod({} as any)).to.be.null;
        expect(normalizeMethod([] as any)).to.be.null;
    }

    @test 'prototype-ish keys are not treated as aliases'() {
        expect(normalizeMethod('constructor')).to.be.null;
        expect(normalizeMethod('__proto__')).to.be.null;
        expect(normalizeMethod('toString')).to.be.null;
        expect(normalizeMethod('hasOwnProperty')).to.be.null;
    }
}
