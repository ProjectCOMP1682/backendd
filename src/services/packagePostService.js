import db from "../models/index";
const { Op, and } = require("sequelize");
import paypal, { order } from 'paypal-rest-sdk'
require('dotenv').config();
paypal.configure({
    'mode': 'sandbox',
    'client_id': process.env.CLIENT_ID,
    'client_secret': process.env.CLIENT_SECRET
});

let creatNewPackagePost = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.name || !data.price || !data.value || data.isHot === '') {
                resolve({
                    errCode: 1,
                    errMessage: 'Missing required parameters !'
                })
            } else {
                let packagePost = await db.PackagePost.create({
                    name: data.name,
                    value: data.value,
                    isHot: data.isHot,
                    price: data.price,
                    isActive: 1
                })
                if (packagePost) {
                    resolve({
                        errCode: 0,
                        errMessage: 'Successfully created product package'
                    })
                }
                else {
                    resolve({
                        errCode: 2,
                        errMessage: 'Product package creation failed'
                    })
                }
            }
        } catch (error) {
            if (error.message.includes('Validation error')) {
                resolve({
                    errCode: 2,
                    errMessage: 'Product package name already exists'
                })
            }
            else {
                reject(error)
            }
        }
    })
}

let updatePackagePost = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.name || !data.price || !data.value || data.isHot === '' || !data.id) {
                resolve({
                    errCode: 1,
                    errMessage: 'Missing required parameters !'
                })
            } else {
                let packagePost = await db.PackagePost.findOne({
                    where: { id: data.id },
                    raw: false
                })
                if (packagePost) {
                    packagePost.name = data.name
                    packagePost.price = data.price
                    packagePost.value = data.value
                    packagePost.isHot = data.isHot
                    await packagePost.save()
                    resolve({
                        errCode: 0,
                        errMessage: 'Update successful'
                    })
                }
                else {
                    resolve({
                        errCode: 2,
                        errMessage: 'Update failed'
                    })
                }
            }
        } catch (error) {
            if (error.message.includes('Validation error')) {
                resolve({
                    errCode: 2,
                    errMessage: 'Product package name already exists'
                })
            }
            else {
                reject(error)
            }
        }
    })
}
let getAllPackage = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.limit || !data.offset) {
                resolve({
                    errCode: 1,
                    errMessage: 'Missing required parameters !'
                })
            } else {
                let objectFilter = {
                    offset: +data.offset,
                    limit: +data.limit
                }

                let packagePosts = await db.PackagePost.findAndCountAll(objectFilter)
                resolve({
                    errCode: 0,
                    data: packagePosts.rows,
                    count: packagePosts.count
                })
            }
        } catch (error) {
            reject(error)
        }
    })
}



let setActiveTypePackage = (data) => {
    return new Promise(async (resolve, reject) => {
        try {

            if (!data.id || data.isActive === '') {
                resolve({
                    errCode: 1,
                    errMessage: `Missing required parameters !`
                })
            } else {
                let packagePost = await db.PackagePost.findOne({
                    where: { id: data.id },
                    raw: false
                })
                if (!packagePost) {
                    resolve({
                        errCode: 2,
                        errMessage: `Product package does not exist`
                    })
                }
                else {
                    packagePost.isActive = data.isActive
                    await packagePost.save()
                    resolve({
                        errCode: 0,
                        errMessage: data.isActive == 0 ? `Package deactivated` : `Package active`
                    })

                }
            }

        } catch (error) {
            reject(error)
        }
    })
}

let getPackageByType = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (data.isHot === '') {
                resolve({
                    errCode: 1,
                    errMessage: `Missing required parameters !`
                })
            } else {
                let packagePost = await db.PackagePost.findAll({
                    where: { isHot: data.isHot }
                })
                resolve({
                    errCode: 0,
                    data: packagePost
                })
            }

        } catch (error) {
            reject(error)
        }
    })
}

let getPackageById = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.id) {
                resolve({
                    errCode: 1,
                    errMessage: `Missing required parameters !`
                })
            } else {
                let packagePost = await db.PackagePost.findOne({
                    where: { id: data.id }
                })
                if (packagePost) {
                    resolve({
                        errCode: 0,
                        data: packagePost
                    })
                }
                else {
                    resolve({
                        errCode: 0,
                        errMessage: 'The data package product was not found'
                    })
                }
            }

        } catch (error) {
            reject(error)
        }
    })
}
let getPaymentLink = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.id || !data.amount) {
                resolve({
                    errCode: 1,
                    errMessage: `Missing required parameters !`

                })
            }
            else {
                let infoItem = await db.PackagePost.findOne({
                    where: { id: data.id }
                })
                let item = [{
                    "name": `${infoItem.name}`,
                    "sku": infoItem.id,
                    "price": infoItem.price,
                    "currency": "USD",
                    "quantity": data.amount
                }]

                let create_payment_json = {
                    "intent": "sale",
                    "payer": {
                        "payment_method": "paypal"
                    },
                    "redirect_urls": {
                        "return_url": `${process.env.URL_REACT}/admin/payment/success`,
                        "cancel_url": `${process.env.URL_REACT}/admin/payment/cancel`
                    },
                    "transactions": [{
                        "item_list": {
                            "items": item
                        },
                        "amount": {
                            "currency": "USD",
                            "total": +data.amount * infoItem.price
                        },
                        "description": "This is the payment description."
                    }]
                };

                paypal.payment.create(create_payment_json, function (error, payment) {
                    if (error) {
                        resolve({
                            errCode: -1,
                            errMessage: error,
                        })

                    } else {
                        resolve({
                            errCode: 0,
                            link: payment.links[1].href
                        })

                    }
                });
            }
        } catch (error) {
            reject(error)
        }
    })
}


let paymentOrderSuccess = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.PayerID || !data.paymentId || !data.token) {
                resolve({
                    errCode: 1,
                    errMessage: 'Missing required parameter !'
                })
            } else {
                let infoItem = await db.PackagePost.findOne({
                    where: { id: data.packageId }
                })
                let execute_payment_json = {
                    "payer_id": data.PayerID,
                    "transactions": [{
                        "amount": {
                            "currency": "USD",
                            "total": +data.amount * infoItem.price
                        }
                    }]
                };

                let paymentId = data.paymentId;

                paypal.payment.execute(paymentId, execute_payment_json, async function (error, payment) {
                    if (error) {
                        resolve({
                            errCode: 0,
                            errMessage: error
                        })
                    } else {
                        let orderPackage = await db.OrderPackage.create({
                            packagePostId: data.packageId,
                            userId: data.userId,
                            currentPrice: infoItem.price,
                            amount: +data.amount
                        })
                        if (orderPackage) {
                            let user = await db.User.findOne({
                                where: { id: data.userId },
                                attributes: {
                                    exclude: ['userId']
                                }
                            })
                            let company = await db.Company.findOne({
                                where: { id: user.companyId },
                                raw: false
                            })
                            if (company) {
                                if (infoItem.isHot == 0) {
                                    company.allowPost += +infoItem.value * +data.amount
                                }
                                else {
                                    company.allowHotPost += +infoItem.value * +data.amount
                                }
                                await company.save({silent: true})

                            }
                        }
                        resolve({
                            errCode: 0,
                            errMessage: 'The system has recorded your purchase history.'
                        })
                    }
                });
            }
        } catch (error) {
            reject(error)
        }
    })
}

module.exports = {
   getAllPackage, setActiveTypePackage,
     creatNewPackagePost, updatePackagePost, getPackageByType,  getPackageById,getPaymentLink, paymentOrderSuccess,
}