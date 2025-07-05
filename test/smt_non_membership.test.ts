import { expect } from "chai";
import { ethers, zkit } from "hardhat";
import { SMT } from "@zk-kit/smt";
import { buildPoseidon } from "circomlibjs";
import { ethers as ethersUtils } from "ethers";

const SMT_DEPTH = 10;

describe("SMTNonMembership", () => {
  it("should verify non-membership proof onchain", async () => {
    // 1. Build the circom-compatible hasher
    const poseidon = await buildPoseidon();

    // 2. Create the robust hash function wrapper
    const hash = (childNodes: any): bigint => {
      const resultAsBytes = poseidon(childNodes);
      const hex = ethersUtils.hexlify(resultAsBytes);
      return BigInt(hex);
    };

    // 3. Initialize the SMT with the correct hash function and bigint mode
    const revocationTree = new SMT(hash, true);

    // 4. THE FIX: Define a raw key and value. DO NOT pre-hash them.
    const revokedKey = BigInt(123456);
    const revokedValue = BigInt(1); // Use a simple non-zero value

    // console.log("Inserting:", {
    // leaf: [revokedKey, revokedValue],
    // hash: hash([revokedKey, revokedValue])
    // });

    // // Let the SMT library perform the leaf hashing: hash([key, value])
    // revocationTree.add(revokedKey, revokedValue);

    // const secret2 = BigInt(789012);
    // revocationTree.add(secret2, BigInt(1));


    // 5. Define the raw key to prove non-membership for.
    const keyToProve = BigInt(999999);

    // Let the SMT library generate the proof against this raw key
    const proof = await revocationTree.createProof(keyToProve);

    console.log("Proof generated for key:", proof);



    // 6. Prepare inputs. The SMT proof object provides all necessary values.
    const siblingsPadded = [...proof.siblings];
    while (siblingsPadded.length < SMT_DEPTH) {
      siblingsPadded.push(0n);
    }

    console.log("Proof:", proof);
    // proof.siblings = siblingsPadded;

    console.log(revocationTree.verifyProof(proof))

    const circuitInputs = {
      root: proof.root,
      siblings: siblingsPadded,
      oldKey: proof.oldKey ?? 0n,
      oldValue: proof.oldValue ?? 0n,
      isOld0: 1n,
      key: keyToProve, // Use the raw key here
    };

    console.log("Circuit Inputs:", circuitInputs);

    const circuit = await zkit.getCircuit("SMTNonMembership");

    const proofData = await circuit.generateProof(circuitInputs);
    const calldata = await circuit.generateCalldata(proofData);

    console.log("calldata:", calldata);

    const Verifier = await ethers.getContractFactory("SMTNonMembershipGroth16Verifier");
    const verifier = await Verifier.deploy();
    await verifier.waitForDeployment();

    expect(await verifier.verifyProof(
      calldata.proofPoints.a,
      calldata.proofPoints.b,
      calldata.proofPoints.c,
      calldata.publicSignals
    )).to.be.true;
  });
});
