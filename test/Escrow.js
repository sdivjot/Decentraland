const { expect } = require('chai');
const { ethers } = require('hardhat');

const tokens = (n) => {
  return ethers.parseUnits(n.toString(), "ether");
}

describe("Escrow", () => {
  let buyer, seller, inspector, lender
  let realEstate, escrow
  beforeEach(async () => {
    signers = await ethers.getSigners()
    buyer = signers[0]
    seller = signers[1]
    inspector = signers[2]
    lender = signers[3]
    //deploy contract
    const RealEstate = await ethers.getContractFactory("RealEstate");
    realEstate = await RealEstate.deploy(seller.address);


    //mint tokens
    let transaction = await realEstate.connect(seller).mint("https://ipfs.io/ipfs/QmTudSYeM7mz3PkYEWXWqPjomRPHogcMFSq7XAvsvsgAPS")
    await transaction.wait()

    // Deploy Escrow
    const Escrow = await ethers.getContractFactory('Escrow')
    escrow = await Escrow.deploy(
      realEstate.getAddress(),
      seller.address,
      inspector.address,
      lender.address
    )

    // Approve Property
    transaction = await realEstate.connect(seller).approve(escrow.getAddress(), 0)
    await transaction.wait()

    // List Property
    transaction = await escrow.connect(seller).list(0, buyer.address, tokens(10), tokens(5))
    await transaction.wait()

    //Total Supply
    
    // console.log("hellooo");
    // console.log(totalSupply.toString());
  })

  describe('Deployment', () => {
    it('Returns NFT address', async () => {
      const result = await escrow.nftAddress()
      expect(result).to.be.equal(await realEstate.getAddress())
    })

    it('Returns seller', async () => {
      const result = await escrow.seller()
      expect(result).to.be.equal(seller.address)
    })

    it('Returns inspector', async () => {
      const result = await escrow.inspector()
      expect(result).to.be.equal(inspector.address)
    })

    it('Returns lender', async () => {
      const result = await escrow.lender()
      expect(result).to.be.equal(lender.address)
    })
  })

  describe('Listing', () => {
    it('Updates as listed', async () => {
      const result = await escrow.isListed(0)
      expect(result).to.be.equal(true)
    })

    it('Returns buyer', async () => {
      const result = await escrow.buyer(0)
      expect(result).to.be.equal(buyer.address)
    })

    it('Returns purchase price', async () => {
      const result = await escrow.purchasePrice(0)
      expect(result).to.be.equal(tokens(10))
    })

    it('Returns escrow amount', async () => {
      const result = await escrow.escrowAmount(0)
      expect(result).to.be.equal(tokens(5))
    })

    it('Updates ownership', async () => {
      expect(await realEstate.ownerOf(0)).to.be.equal(await escrow.getAddress())
    })
  })

  describe('Deposits', () => {
    beforeEach(async () => {
      const transaction = await escrow.connect(buyer).depositEarnest(0, { value: tokens(5) })
      await transaction.wait()
    })
    it('Gives total supply', async()=>{
      const totalSupply = await realEstate.connect(seller).totalSupply()
    expect(totalSupply).to.be.equal(1);
    })
    it('Updates contract balance', async () => {
      const result = await ethers.provider.getBalance(escrow.getAddress())
      expect(result).to.be.equal(tokens(5))
    })
  })

  describe('Inspection', () => {
    beforeEach(async () => {
      const transaction = await escrow.connect(inspector).updateInspectionStatus(0, true)
      await transaction.wait()
    })

    it('Updates inspection status', async () => {
      const result = await escrow.inspectionPassed(0)
      expect(result).to.be.equal(true)
    })
  })

  describe('Approval', () => {
    beforeEach(async () => {
      let transaction = await escrow.connect(buyer).approveSale(0)
      await transaction.wait()

      transaction = await escrow.connect(seller).approveSale(0)
      await transaction.wait()

      transaction = await escrow.connect(lender).approveSale(0)
      await transaction.wait()
    })

    it('Updates approval status', async () => {
      expect(await escrow.approval(0, buyer.address)).to.be.equal(true)
      expect(await escrow.approval(0, seller.address)).to.be.equal(true)
      expect(await escrow.approval(0, lender.address)).to.be.equal(true)
    })
  })

  describe('Sale', () => {
    beforeEach(async () => {
      let transaction = await escrow.connect(buyer).depositEarnest(0, { value: tokens(5) })
      await transaction.wait()

      transaction = await escrow.connect(inspector).updateInspectionStatus(0, true)
      await transaction.wait()

      transaction = await escrow.connect(buyer).approveSale(0)
      await transaction.wait()

      transaction = await escrow.connect(seller).approveSale(0)
      await transaction.wait()

      transaction = await escrow.connect(lender).approveSale(0)
      await transaction.wait()

      await lender.sendTransaction({ to: await escrow.getAddress(), value: tokens(5) })

      transaction = await escrow.connect(seller).finalizeSale(0)
      await transaction.wait()
    })

    it('Updates ownership', async () => {
      expect(await realEstate.ownerOf(0)).to.be.equal(buyer.address)
    })

    it('Updates balance', async () => {
      expect(await escrow.getBalance()).to.be.equal(0)
    })
  })
})