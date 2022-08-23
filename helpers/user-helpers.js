var db = require('../config/connection')
var collection = require('../config/collections')
const bcrypt = require('bcrypt')
var otp = require('../config/otp')

require('dotenv').config()
const SSID =process.env.serviceID
const ASID =process.env.accountSID
const AUID =process.env.authToken


var objectId = require('mongodb').ObjectId
const { VerificationCheckInstance } = require('twilio/lib/rest/verify/v2/service/verificationCheck')
const { response } = require('express')
const { ObjectID } = require('bson')
const client = require('twilio')(ASID, AUID)
const Razorpay = require('razorpay')
const { log } = require('console')
const { resolve } = require('path')
const paypal = require('paypal-rest-sdk');

paypal.configure({
    'mode': 'sandbox', //sandbox or live
    'client_id': 'AVRa804fwNGZE-PLhFDnFGYq-_jjT_DNr2vhd1VwwKFTeD9Hls5eOkT62tkjOIoy_zCamwg-7ZieBzyW',
    'client_secret': 'EI42yDiZTXfvvc44CNUVWp8d16_7PC73cZ53SJuD4Vncg2nsyl9gDys6D_5VtD148gBpj_nF8ePAmhFk'
});



var instance = new Razorpay({
    key_id: 'rzp_test_SeYw68VKQZXq8w',
    key_secret: 'CP5vgDPpeRy1qaz60bckcPQY',
});
module.exports = {
    doSignup: (userData) => {
        return new Promise(async (resolve, reject) => {
            userData.Password = await bcrypt.hash(userData.Password, 10)
            let userSignup = await db.get().collection(collection.USER_COLLECTION).findOne({ Number: userData.Number })
            console.log(userSignup);
            let signupData = {}
            if (userSignup) {
                signupData.err = "Mobile Number is already exists";
                resolve(signupData)
            } else {
                userData.status = true;
                signupData = userData;
                client.verify.services(SSID).verifications.create(
                    {
                        to: `+91${signupData.Number}`,
                        channel: 'sms'
                    }).then((data) => {
                        res.status(200).send(data)
                    })
                resolve(signupData)

            }


        })
    },
    signupOtp: (userData, userDetails) => {
        return new Promise((resolve, reject) => {
            let response = {}
            client.verify.services(SSID)
                .verificationChecks
                .create({
                    to: `+91${userDetails.Number}`,
                    code: userData.Otp
                })
                .then((verification_check) => {
                    console.log(verification_check.status);
                    if (verification_check.status == 'approved') {
                        db.get().collection(collection.USER_COLLECTION).insertOne(userDetails).then((data) => {
                            resolve(userDetails)
                        })
                    } else {
                        response.err = 'otp is invalid';
                        console.log(response);
                        resolve(response)
                    }
                })
        })
    },

    doLogin: (userData) => {
        return new Promise(async (resolve, reject) => {
            let loginStatus = false
            let response = {}
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({ Email: userData.Email })
            if (user) {
                bcrypt.compare(userData.Password, user.Password).then((status) => {
                    if (status) {
                        if (user.status) {
                            console.log("Login Success")
                            response.user = user
                            response.status = true
                            resolve(response)
                        }
                        else {
                            response.err = "Account is Blocked";
                            response.status = false;
                            // console.log("Login Failed");
                            // resolve({status:false})
                            resolve(response)
                        }
                    }
                })
            }
            else {
                console.log("Login Failed");
                resolve({ status: false })
            }

        })
    },
    signUpCheck: (Email) => {
        return new Promise(async (resolve, reject) => {
            let response = {}
            let email = await db.get().collection(collection.USER_COLLECTION).findOne({ Email: Email.Email });
            if (email) {
                console.log('same email');
                response.status = true
                resolve(response)

            } else {
                console.log('no same email');
                // response.status=true
                resolve({ status: false })
            }
        })

    },
    addToCart: (proId, userId) => {
        let proObj = {
            item: objectId(proId),
            quantity: 1
        }
        return new Promise(async (resolve, reject) => {
            let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
            if (userCart) {
                let proExist = userCart.products.findIndex(product => product.item == proId)
                console.log(proExist);
                if (proExist != -1) {
                    db.get().collection(collection.CART_COLLECTION)
                        .updateOne({ user: objectId(userId), 'products.item': objectId(proId) },
                            {
                                $inc: { 'products.$.quantity': 1 }
                            }
                        ).then(() => {
                            resolve()
                        })
                } else {
                    db.get().collection(collection.CART_COLLECTION).updateOne({ user: objectId(userId) },
                        {
                            $push: { products: proObj }
                        }
                    ).then((response) => {
                        resolve()
                    })
                }
            }
            else {
                let cartObj = {
                    user: objectId(userId),
                    products: [proObj]
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response) => {
                    resolve()
                })
            }
        })
    },
    getCartProducts: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cartItems = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'

                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                }

            ]).toArray()

            resolve(cartItems)
        })
    },
    getCartCount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let count = 0;
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
            if (cart) {
                count = cart.products.length
            }
            resolve(count)
        })
    },
    changeProductQuantity: (details) => {
        details.count = parseInt(details.count)
        details.quantity = parseInt(details.quantity)
        return new Promise((resolve, reject) => {
            if (details.count == -1 && details.quantity == 1) {
                db.get().collection(collection.CART_COLLECTION)
                    .updateOne({ _id: objectId(details.cart) },
                        {
                            $pull: { products: { item: objectId(details.product) } }
                        }
                    ).then((response) => {
                        resolve({ removeProduct: true })
                    })
            } else {
                db.get().collection(collection.CART_COLLECTION)
                    .updateOne({ _id: objectId(details.cart), 'products.item': objectId(details.product) },
                        {
                            $inc: { 'products.$.quantity': details.count }
                        }
                    ).then((response) => {
                        resolve({ status: true })
                    })
            }
        })
    },
    removeItem: (details) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CART_COLLECTION)
                .updateOne({ _id: objectId(details.cart) },
                    {
                        $pull: { products: { item: objectId(details.product) } }
                    }
                ).then((response) => {
                    resolve({ removeProduct: true })
                })
        })
    },
    getCategoryName: (name) => {
        return new Promise(async (resolve, reject) => {
            let product = await db.get().collection(collection.PRODUCT_COLLECTION).find({ Category: name }).toArray()
            console.log("hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh");
            resolve(product)
        })
    },
    getTotalValue: (userId) => {
        return new Promise(async (resolve, reject) => {
            let total = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'

                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: { $multiply: ['$quantity', { $toInt: '$product.Price' }] } }
                    }
                }

            ]).toArray()
            console.log(total)

            if (total[0]) {
                console.log(total[0].total);
                resolve(total[0].total)

            } else {
                resolve(0)
            }

        })
    },


    getSinglePrice: (userId) => {


        return new Promise(async (resolve, reject) => {


            let productprice = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },

                {
                    $project: {

                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] },

                    }
                },
                {
                    $project: {
                        item: 1,
                        quantity: 1,
                        product: 1,
                        total: { $sum: { $multiply: ['$quantity', { $toInt: '$product.Price' }] } }
                    }

                }

            ]).toArray()
            console.log(productprice)

            resolve(productprice)

        })

    },
    placeOrder: (order, products, total, userId, offertotal, offer, coupon, totals) => {
        console.log(order);
        console.log(total);
        console.log("aaaaaaaaaaaaaaaaa");
        return new Promise((resolve, reject) => {
            // console.log(order, products, total);
            console.log('sa');
            let status = order.paymentMethod === 'COD' ? 'placed' : 'pending'
            let orderObj = {
                // deliveryDetails: {
                //     name: order.name,
                //     mobile: order.mobile,
                //     address: order.address,
                //     state: order.state,
                //     pincode: order.pincode
                // },
                deliveryDetails: objectId(order.address),
                userId: objectId(userId),
                paymentMethod: order.paymentMethod,
                totalAmount: total,
                products: products,

                status: status,
                offer: offertotal,
                offercoupon: offer,

                coupon: coupon,
                total: totals,

                date: new Date()
            }

            db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response) => {

                resolve(response.insertedId)
            })
        })


    },
    getCartProductList: (userId) => {
        return new Promise(async (resolve, reject) => {
            console.log(userId);
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
            console.log(cart);
            resolve(cart.products)
        })
    },
    getUserOrders: (userId) => {
        console.log(userId);
        console.log("***********************");
        return new Promise(async (resolve, reject) => {
            console.log(userId);
            let orders = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { userId: objectId(userId) }
                },
                {
                    $project: {
                        date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                        deliveryDetails: 1,
                        userId: 1,
                        paymentMethod: 1,
                        products: 1,
                        totalAmount: 1,
                        status: 1,
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },

            ]).sort({ date: -1 }).toArray()
            // console.log(orders)
            console.log("kkkkkkkkkkkkkkkkkkkkk");
            resolve(orders)
        })
    },
    getOrderProducts: (orderId) => {
        return new Promise(async (resolve, reject) => {
            let orderItems = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { _id: objectId(orderId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity',

                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] },
                    }
                }
            ]).toArray()
            console.log('thenga');
            console.log(orderItems);

            resolve(orderItems)
        })
    },
    cancelOrder: (orderId, userId) => {

        return new Promise(async (resolve, reject) => {
            let order = await db.get().collection(collection.ORDER_COLLECTION).findOne({ _id: objectId(orderId) })
            console.log("vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv");
            console.log(order.userId);
            console.log(order.paymentMethod);
            console.log(order.totalAmount);
            db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(orderId) },
                {
                    $set: {
                        status: 'cancelled'
                    }
                }).then((response) => {
                    resolve(response)
                })
            console.log("test test 123");
            if (order.paymentMethod != 'COD') {
                let user = await db.get().collection(collection.WALLET_COLLECTION).findOne({ userId: objectId(userId) })
                console.log(user);
                console.log("//////////////////////");
                if (user) {
                    let newtotal = (user.total) + (order.totalAmount);
                    console.log(newtotal);
                    console.log("????????????");
                    await db.get().collection(collection.WALLET_COLLECTION).updateOne({ userId: objectId(userId) }, {
                        $set: {
                            total: newtotal
                        }
                    })
                    await db.get().collection(collection.WALLET_COLLECTION).updateOne({ userId: objectId(userId) }, {
                        $push: {
                            transaction: {
                                walletamount: order.totalAmount,
                                status: true,
                                orderId: orderId
                            }
                        }
                    })


                }
                else {
                    let wallet = {
                        userId: objectId(order.userId),
                        total: parseInt(order.totalAmount),
                        transaction: []
                    }
                    db.get().collection(collection.WALLET_COLLECTION).insertOne(wallet).then((response) => {
                        console.log(response);
                        console.log("100000001");
                        resolve(response)
                    })


                }
            }
        })
    },
    generateRazorpay: (orderId, total) => {
        return new Promise((resolve, reject) => {
            var options = {
                amount: total * 100,
                currency: "INR",
                receipt: "" + orderId
            };
            instance.orders.create(options, function (err, order) {
                if (err) {
                    console.log(err);
                } else {
                    console.log("New Order:", order);
                    resolve(order)
                }
            })
        })
    },
    verifyPayment: (details) => {
        return new Promise((resolve, reject) => {
            const crypto = require('crypto');
            let hmac = crypto.createHmac('sha256', 'CP5vgDPpeRy1qaz60bckcPQY')

            hmac.update(details['payment[razorpay_order_id]'] + '|' + details['payment[razorpay_payment_id]']);
            hmac = hmac.digest('hex')
            if (hmac == details['payment[razorpay_signature]']) {
                resolve()
            } else {
                reject()
            }
        })
    },
    changePaymentStatus: (orderId, walletStatus, walletAmount) => {
        console.log(orderId);
        console.log("lllllllllllllllllllllllllllllllllll");
        return new Promise(async (resolve, reject) => {
            if (walletStatus) {
                let order = await db.get().collection(collection.ORDER_COLLECTION).findOne({ _id: objectId(orderId) })
                console.log(order);

                console.log("order correct");
                let total = order.totalAmount - walletAmount
                db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(orderId) }, {
                    $set: {
                        status: 'placed',
                        totalAmount: {
                            walletAmount: walletAmount,
                            totalAmount: total
                        }
                    }
                }
                ).then(() => {
                    resolve()
                })
            } else {
                db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(orderId) }, {
                    $set: {
                        status: 'placed'
                    }
                }
                ).then(() => {
                    resolve()
                })
            }
        })
    },

    getAddress: (userId) => {
        console.log(userId);
        return new Promise(async (resolve, reject) => {
            let address = await db.get().collection(collection.ADDRESS_COLLECTION).find({ userId: objectId(userId) }).toArray()
            console.log("vanillaaaa");
            console.log(address);
            resolve(address)


        })
    },
    getAddressDetails: (id) => {
        console.log(id);
        console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
        return new Promise(async (resolve, reject) => {
            let address = await db.get().collection(collection.ADDRESS_COLLECTION).findOne({ _id: objectId(id) })
            console.log(address);
            console.log("iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii");
            resolve(address)
        })
    },
    updateAddress: (id, data) => {
        console.log(id);
        console.log("ppppppppppppppppppppppppppppppppp");
        console.log(data);
        return new Promise(async (resolve, reject) => {
            await db.get().collection(collection.ADDRESS_COLLECTION).updateOne({ _id: objectId(id) }, {
                $set: {
                    
                    userId: objectId(data.userId),
                    "addressdetails.name": data.name,
                    "addressdetails.mobile": data.mobile,
                    "addressdetails.address": data.address,
                    "addressdetails.state": data.state,
                    "addressdetails.pincode": data.pincode
                    
                }
            }).then((response) => {
                console.log("updated");
                resolve(response)
            })

        })


    },
    changePassword: (userData) => {
        console.log("password change");
        return new Promise(async (resolve, reject) => {
            console.log("ayooooooooooo");
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({ Email: userData.Email })
            if (user) {
                bcrypt.compare(userData.oldpassword, user.Password).then(async (status) => {
                    if (status) {
                        let Password = await bcrypt.hash(userData.newpassword, 10)
                        db.get().collection(collection.USER_COLLECTION).updateOne({ Email: userData.Email }, {
                            $set: {
                                Password: Password
                            }
                        }).then(() => {
                            resolve({ status: true })
                        })
                        console.log("passssss");
                    } else {
                        console.log("password potti");
                        resolve({ status: false })
                    }
                })
            } else {
                console.log("Attempt failed");
                resolve({ status: false })
            }
        })
    },
    addAddress: (add) => {
        return new Promise((resolve, reject) => {
            let addObj = {
                addressdetails: {
                    name: add.name,
                    mobile: add.mobile,
                    address: add.address,
                    state: add.state,
                    pincode: add.pincode
                },
                userId: objectId(add.userId)
            }
            db.get().collection(collection.ADDRESS_COLLECTION).insertOne(addObj).then(() => {
                resolve()
            })
        })
    },
    generatePaypal: (order, total) => {
        console.log(total);
        console.log("hhhhllllllk");
        return new Promise((resolve, reject) => {
            const create_payment_json = {
                "intent": "sale",
                "payer": {
                    "payment_method": "paypal"
                },
                "redirect_urls": {
                    "return_url": "http://localhost:3000/success",
                    "cancel_url": "http://localhost:3000/cancel"
                },
                "transactions": [{
                    "item_list": {
                        "items": [{
                            "name": "Red Sox Hat",
                            "sku": "001",
                            "price": total,
                            "currency": "USD",
                            "quantity": 1
                        }]
                    },
                    "amount": {
                        "currency": "USD",
                        "total": total
                    },
                    "description": "Hat for the best team ever"
                }]
            };
            paypal.payment.create(create_payment_json, function (error, payment) {
                console.log("009998887");
                if (error) {
                    console.log(error);
                    throw error;
                } else {
                    console.log("Create Payment Response");
                    console.log(payment);
                    resolve(payment)
                }
            });
            console.log("gghghghh");
        })
    },
    removeCart: (userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CART_COLLECTION).deleteOne({ user: objectId(userId) })
        })
    },
    changeStatus: (userId, orderID) => {

        console.log(userId);
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(orderID), userId: objectId(userId) }, {
                $set: {
                    status: 'placed'
                }
            }
            ).then((data) => {
                console.log(data);
                resolve()
            })

        })
    },
    returnOrder: (orderId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(orderId) },
                {
                    $set: {
                        status: 'Return-request raised'
                    }
                }).then((response) => {
                    resolve(response)
                })
        })
    },


    getWallet: (userId) => {
        return new Promise(async (resolve, reject) => {
            let total = await db.get().collection(collection.WALLET_COLLECTION).findOne({ userId: objectId(userId) })
            console.log(total);
            console.log("wallet vanu");
            resolve(total)

        })
    },
    getOfferValue: (userId) => {
        return new Promise(async (resolve, reject) => {
            let total = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'

                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: { $multiply: ['$quantity', { $toInt: '$product.offerprice' }] } }
                    }
                }

            ]).toArray()
            console.log(total)

            if (total[0]) {
                console.log(total[0].total);
                resolve(total[0].total)

            } else {
                resolve(0)
            }

        })
    },
    getCoupon: (data) => {
        console.log(data);
        return new Promise(async (resolve, reject) => {
            coupon = await db.get().collection(collection.COUPON_COLLECTION).findOne({ couponname: data.couponname })
            resolve(coupon)
        })
    },
    reduceTotalWallet: (userId, total, orderId) => {
 
        return new Promise((resolve, reject) => {
            db.get().collection(collection.WALLET_COLLECTION).updateOne({ userId: objectId(userId) }, {
                $inc: {
                    total: -total
                }

                // history: [
                //     {
                //         walletAmount:,
                //         transactionStatus:,
                //         orderId:,
                //     }
                // ]
            })
            console.log(total);
           
            db.get().collection(collection.WALLET_COLLECTION).updateOne({ userId: objectId(userId) }, {
                $push: {
                    transaction: {
                        returnamount: total,
                        status: false,
                        orderId: orderId
                    }

                }
            })
                .then((response) => {
                    console.log(response);
                    console.log("iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii");
                    resolve(response)

                })
        })

    },
    updateStatus: (orderId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(orderId) }, {
                $set: {
                    status: 'placed',
                    paymentMethod: 'wallet'
                }
            }).then(() => {
                resolve()
            })
        })
    },
    changePaidStatus: (orderId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(orderId) }, {
                $set: {
                    status: 'placed'
                }
            }
            ).then(() => {
                resolve()
            })
        })
    },
    reduceWallet: (userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.WALLET_COLLECTION).updateOne({ userId: objectId(userId) }, {
                $set: {
                    total: 0
                }
            }).then((response) => {
                console.log(response);
                console.log("hai evideya");
                resolve(response)
            })
        })
    },
    checkCoupon: (body, userId) => {
        console.log(body);
        console.log("ooooooooooooooooooooooooooooooooooooo");
        return new Promise(async (resolve, reject) => {
            let check = await db.get().collection(collection.COUPON_COLLECTION).findOne({ couponname: body })
            console.log(check);
            console.log("ethiyooooo");
            if (check.status) {
                let usercoupon = await db.get().collection(collection.USER_COLLECTION).findOne({ _id: objectId(userId) })
                console.log(usercoupon);
                console.log("evideeeeee kannaaaannnillllaaaa");
                let user = await db.get().collection(collection.USER_COLLECTION).findOne({ _id: objectId(userId), coupon: body })
                let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
               
                    if (user) {
                        resolve({ status: 'used' })
                    } else if (cart.coupon) {
                        console.log('cart');
                        console.log(cart);
                        resolve({ status: 'only once' })
                        // if (cart.coupon) {
                        // } else {
                        //     db.get().collection(collection.USER_COLLECTION).updateOne({ _id: objectId(userId) }, {
                        //         $push: { coupon: body }
                        //     })
                        //     db.get().collection(collection.CART_COLLECTION).updateOne({ _id: objectId(userId) }, {
                        //         $set: {
                        //             coupon: body,
                        //             coupondiscount: check.discountper
                        //         }
                        //     })
                        //     resolve({ status: true })
                        // }
                    } else {
                        // db.get().collection(collection.USER_COLLECTION).updateOne({ _id: objectId(userId) }, {
                        //     $set: {
                        //         coupon: [check.couponname]

                        //     }
                        // })
                        db.get().collection(collection.USER_COLLECTION).updateOne({ _id: objectId(userId) }, {
                            $push: { coupon: body
                                       }
                        })
                        let wallobj = {
                            user: userId,
                            coupon: body
                       }  
                          db.get().collection(collection.COUPON_HISTORY).insertOne(wallobj).then(()=>{
                            resolve()
                          })                   
                        db.get().collection(collection.CART_COLLECTION).updateOne({ user: objectId(userId) }, {
                            $set: {
                                coupon: check.couponname,
                                coupondis: check.discountper
                            }
                        })
                        resolve({ status: true })
                    }
                
                
            }

            else {
                resolve({ status: "disabled"  })

            }
        })
    },


    findCoupon: (userId) => {
        return new Promise(async (resolve, reject) => {
            let coupon = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
            resolve(coupon)
            console.log(coupon);
            console.log("--------------------");
        })
    },
    getInvoice: (orderId, userId) => {
        return new Promise(async (resolve, reject) => {
            let orders = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { _id: objectId(orderId) }
                },
                {
                    $unwind: '$products'
                },

                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        date: 1,
                        deliveryDetails: 1,
                        userId: 1,
                        paymentMethod: 1,
                        offercoupon: 1,
                        coupon: 1,
                        offer: 1,
                        totalAmount: 1,
                        total: 1,
                        status: 1,
                        item: '$products.item',

                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.ADDRESS_COLLECTION,
                        localField: 'deliveryDetails',
                        foreignField: '_id',
                        as: 'address'
                    }
                },
                {
                    $project: {
                        date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                        userId: 1,
                        paymentMethod: 1,

                        offercoupon: 1,
                        coupon: 1,
                        offer: 1,
                        totalAmount: 1,
                        total: 1,
                        status: 1,

                        item: { $arrayElemAt: ['$product', 0] },
                        address: { $arrayElemAt: ['$address', 0] },
                        totalAmount: 1,
                        status: 1
                    }  
                }


            ]).toArray()
            console.log("{{{{{{{{{{{{{{{{{{{{");


            resolve(orders)
        })
    },
    transHistory: (userId) => {
        return new Promise(async (resolve, reject) => {
            let order = await db.get().collection(collection.WALLET_COLLECTION).aggregate([
                {
                    $match: { userId: objectId(userId) }
                },
                {
                    $unwind: '$transaction'
                },

                {
                    $project: {

                        orderId: '$transaction.orderId',
                        walletamount: '$transaction.walletamount',
                        orderId: '$transaction.orderId',
                        returnamount: '$transaction.returnamount',
                        status: '$transaction.status'

                    }
                },

            ]).toArray()
            console.log("CCCCCCCCCCCCCCCCCCCCCCCCCCCC");
            console.log(order);
            resolve(order)

        })
    },


}
