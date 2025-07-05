pragma circom 2.0.0;

include "circomlib/circuits/smt/smtverifier.circom";

template SMTNonMembership(nLevels) {
    signal input root;
    signal input siblings[nLevels];
    signal input oldKey;
    signal input oldValue;   // Should be 0
    signal input isOld0;     // Should be 1
    signal input key;

    signal value;
    signal fnc;
    signal enabled;

    value <-- 0;
    fnc <-- 1; // exclusion proof
    enabled <-- 1;    

    component smt = SMTVerifier(nLevels);
    smt.enabled <== enabled;
    smt.root <== root;

    for (var i = 0; i < nLevels; i++) {
        smt.siblings[i] <== siblings[i];
    }

    smt.oldKey <== oldKey;
    smt.oldValue <== oldValue;
    smt.isOld0 <== isOld0;
    smt.key <== key;
    smt.value <== value;
    smt.fnc <== fnc;
}

// Only root is public
component main {public [root]} = SMTNonMembership(10);
