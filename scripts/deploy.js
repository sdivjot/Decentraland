const hre = require("hardhat")

const tokens = (n) => {
    return ethers.parseUnits(n.toString(), 'ether')
}

async function main() {
    const [buyer, seller, inspector, lender] = await ethers.getSigners()
    const RealEstate = await ethers.getContractFactory('RealEstate')
    const realEstate = await RealEstate.deploy(seller.address)

    console.log(`Deployed Real Estate Contract at: ${await realEstate.getAddress()}`)
    console.log(`Minting 3 properties...\n`)

    for (let i = 0; i < 3; i++) {
        const transaction = await realEstate.connect(seller).mint(`https://ipfs.io/ipfs/QmQVcpsjrA6cr1iJjZAodYwmPekYgbnXGo4DFubJiLc2EB/${i + 1}.json`)
        await transaction.wait()
    }


    // Deploy Escrow
    const Escrow = await ethers.getContractFactory('Escrow')
    const escrow = await Escrow.deploy(
        await realEstate.getAddress(),
        seller.address,
        inspector.address,
        lender.address
    )

    console.log(`Deployed Escrow Contract at: ${await escrow.getAddress()}`)
    console.log(`Listing 3 properties...\n`)


    for (let i = 0; i < 3; i++) {
        // Approve properties...
        let transaction = await realEstate.connect(seller).approve(escrow.getAddress(), i)
        await transaction.wait()
    }


    // Listing properties...
    transaction = await escrow.connect(seller).list(0, buyer.address, tokens(20), tokens(10))
    await transaction.wait()

    transaction = await escrow.connect(seller).list(1, buyer.address, tokens(15), tokens(5))
    await transaction.wait()

    transaction = await escrow.connect(seller).list(2, buyer.address, tokens(10), tokens(5))
    await transaction.wait()

    console.log(`Finished.`)
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});