const { Op, and, where } = require("sequelize");
import e from "express";
import db from "../models/index";
const cloudinary = require('../utils/cloudinary');
require('dotenv').config();
var nodemailer = require('nodemailer');
let sendmail = (note, userMail, link = null) => {
    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_APP,
            pass: process.env.EMAIL_APP_PASSWORD,
        }
    });

    var mailOptions = {
        from: process.env.EMAIL_APP,
        to: userMail,
        subject: 'Notice from Job Finder page',
        html: note
    };
    if (link)
    {
        mailOptions.html = note + ` <br>
        View company information <a href='${process.env.URL_REACT}/${link}'>Here</a> `
    }

    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
        } else {
        }
    });
}
let checkCompany = (name, id = null) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!name) {
                resolve({
                    errCode: 1,
                    errMessage: 'Missing required parameters!'
                })
            } else {
                let company = null
                if (id) {
                    company = await db.Company.findOne({
                        where: { name: name, id: { [Op.ne]: id } }
                    })
                }
                else {
                    company = await db.Company.findOne({
                        where: { name: name }
                    })
                }
                if (company) {
                    resolve(true)
                } else {
                    resolve(false)
                }
            }


        } catch (error) {
            reject(error)
        }
    })
}


let handleCreateNewCompany = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            resolve({
                errCode: 2,
                errMessage: 'Company name already exists'
            })
            if (!data.name || !data.phonenumber || !data.address
                || !data.descriptionHTML || !data.descriptionMarkdown
                || !data.amountEmployer || !data.userId) {
                resolve({
                    errCode: 1,
                    errMessage: 'Missing required parameters !'
                })
            } else {
                if (await checkCompany(data.name)) {
                }
                else {
                    let thumbnailUrl = ""
                    let coverimageUrl = ""
                    if (data.thumbnail && data.coverimage) {

                        const uploadedThumbnailResponse = await cloudinary.uploader.upload(data.thumbnail, {
                            upload_preset: 'dev_setups'
                        })
                        const uploadedCoverImageResponse = await cloudinary.uploader.upload(data.coverimage, {
                            upload_preset: 'dev_setups'
                        })
                        thumbnailUrl = uploadedThumbnailResponse.url
                        coverimageUrl = uploadedCoverImageResponse.url
                    }


                    let company = await db.Company.create({
                        name: data.name,
                        thumbnail: thumbnailUrl,
                        coverimage: coverimageUrl,
                        descriptionHTML: data.descriptionHTML,
                        descriptionMarkdown: data.descriptionMarkdown,
                        website: data.website,
                        address: data.address,
                        phonenumber: data.phonenumber,
                        amountEmployer: data.amountEmployer,
                        taxnumber: data.taxnumber,
                        statusCode: 'S1',
                        userId: data.userId,
                        censorCode: data.file ? 'CS3' : 'CS2',
                        file: data.file ? data.file : null
                    })
                    let user = await db.User.findOne({
                        where: { id: data.userId },
                        raw: false,
                        attributes: {
                            exclude: ['userId']
                        }
                    })

                    let account = await db.Account.findOne({
                        where: { userId: data.userId },
                        raw: false
                    })

                    if (user && account) {
                        user.companyId = company.id
                        await user.save()
                        account.roleCode = 'COMPANY'
                        await account.save()
                        resolve({
                            errCode: 0,
                            errMessage: 'Successfully created company',
                            companyId : company.id
                        })
                    }
                    else {
                        resolve({
                            errCode: 2,
                            errMessage: 'User not found'
                        })
                    }
                }
            }
        } catch (error) {
            reject(error)
        }
    })
}
let handleUpdateCompany = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.id || !data.name || !data.phonenumber || !data.address || !data.descriptionHTML || !data.descriptionMarkdown || !data.amountEmployer) {
                resolve({
                    errCode: 1,
                    errMessage: 'Missing required parameters !'
                })
            } else {
                if (await checkCompany(data.name, data.id)) {
                    resolve({
                        errCode: 2,
                        errMessage: 'Company name already exists'
                    })
                }
                else {

                    let res = await db.Company.findOne({
                        where: {
                            id: data.id
                        },
                        raw: false
                    })
                    if (res) {
                        if (res.statusCode == "S1") {
                            if (data.thumbnail) {
                                let thumbnailUrl = ""
                                const uploadedThumbnailResponse = await cloudinary.uploader.upload(data.thumbnail, {
                                    upload_preset: 'dev_setups'
                                })
                                thumbnailUrl = uploadedThumbnailResponse.url
                                res.thumbnail = thumbnailUrl
                            }
                            if (data.coverimage) {
                                let coverImageUrl = ""
                                const uploadedcoverImageResponse = await cloudinary.uploader.upload(data.coverimage, {
                                    upload_preset: 'dev_setups'
                                })
                                coverImageUrl = uploadedcoverImageResponse.url
                                res.coverimage = coverImageUrl
                            }
                            res.name = data.name
                            res.descriptionHTML = data.descriptionHTML
                            res.descriptionMarkdown = data.descriptionMarkdown
                            res.website = data.website
                            res.address = data.address
                            res.amountEmployer = data.amountEmployer
                            res.taxnumber = data.taxnumber
                            res.phonenumber = data.phonenumber
                            if (data.file) {
                                res.file = data.file
                                res.censorCode = 'CS3'
                            }
                            else if (res.file){
                                res.censorCode = 'CS3'
                            }
                            else {
                                res.censorCode = 'CS2'
                            }
                            await res.save();
                            resolve({
                                errCode: 0,
                                errMessage: 'Company information edited successfully'
                            })
                        }
                        else {
                            resolve({
                                errCode: 2,
                                errMessage: 'Your company has been blocked from changing information.'
                            })
                        }
                    }
                    else {
                        resolve({
                            errCode: 2,
                            errMessage: 'Company not found'
                        })
                    }
                }

            }
        } catch (error) {
            reject(error)
        }
    })
}
let handleBanCompany = (companyId) => {
    return new Promise(async (resolve, reject) => {
        try {

            if (!companyId) {
                resolve({
                    errCode: 1,
                    errMessage: `Missing required parameters !`
                })
            } else {
                let foundCompany = await db.Company.findOne({
                    where: { id: companyId },
                    raw: false
                })
                if (!foundCompany) {
                    resolve({
                        errCode: 2,
                        errMessage: `Company does not exist`
                    })
                }
                foundCompany.statusCode = 'S2'
                await foundCompany.save()
                resolve({
                    errCode: 0,
                    message: `Company operations have been discontinued`
                })
            }

        } catch (error) {
            reject(error)
        }
    })
}
let handleUnBanCompany = (companyId) => {
    return new Promise(async (resolve, reject) => {
        try {

            if (!companyId) {
                resolve({
                    errCode: 1,
                    errMessage: `Missing required parameters !`
                })
            } else {
                let foundCompany = await db.Company.findOne({
                    where: { id: companyId },
                    raw: false
                })
                if (!foundCompany) {
                    resolve({
                        errCode: 2,
                        errMessage: `Company does not exist`
                    })
                }
                else {
                    foundCompany.statusCode = 'S1'
                    await foundCompany.save()
                    resolve({
                        errCode: 0,
                        message: `Opened operations for the company`
                    })
                }
            }

        } catch (error) {
            reject(error)
        }
    })
}
let handleAccecptCompany = (data) => {
    return new Promise(async (resolve, reject) => {
        try {

            if (!data.companyId) {
                resolve({
                    errCode: 1,
                    errMessage: `Missing required parameters !`
                })
            } else {
                let foundCompany = await db.Company.findOne({
                    where: { id: data.companyId },
                    raw: false
                })
                if (foundCompany) {
                    if (data.note == null)
                    {
                        foundCompany.censorCode = "CS1"
                    }
                    else {
                        foundCompany.censorCode = "CS2"
                    }
                    await foundCompany.save()
                    let note = data.note != null ? data.note : `Company ${foundCompany.name} của bạn đã kiểm duyệt thành công`
                    let user = await db.User.findOne({
                        where: { id: foundCompany.userId },
                        attributes: {
                            exclude: ['userId']
                        }
                    })

                    if (data.note != null) {
                        sendmail(`Your company was rejected because: ${note}`, user.email,"admin/edit-company")
                    }
                    else {
                        sendmail(`Your company has been successfully verified.`,user.email,`detail-company/${foundCompany.id}`)
                    }
                    resolve({
                        errCode: 0,
                        errMessage: data.note != null ? "Returned to pending status" : "Company approved successfully"
                    })
                }
                else {
                    resolve({
                        errCode: 2,
                        errMessage: 'No company exist'
                    })
                }
            }

        } catch (error) {
            reject(error)
        }
    })
}
let getListCompany = (data) => {
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
                    limit: +data.limit,
                    where: {statusCode : 'S1'}
                }
                if (data.search) {
                    objectFilter.where = { ...objectFilter.where,
                        name: {[Op.like]: `%${data.search}%`}
                    }
                }
                let company = await db.Company.findAndCountAll(objectFilter)
                resolve({
                    errCode: 0,
                    data: company.rows,
                    count: company.count
                })
            }
        } catch (error) {
            reject(error)
        }
    })
}
let getAllCompanyByAdmin = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.limit || data.offset === '') {
                resolve({
                    errCode: 1,
                    errMessage: 'Missing required parameters !'
                })
            } else {
                let objectFilter = {
                    order: [['updatedAt', 'DESC']],
                    limit: +data.limit,
                    offset: +data.offset,
                    attributes: {
                        exclude: ['detailPostId']
                    },
                    nest: true,
                    raw: true,
                    include: [
                        { model: db.Allcode, as: 'statusCompanyData', attributes: ['value', 'code'] },
                        { model: db.Allcode, as: 'censorData', attributes: ['value', 'code'] }
                    ]
                }
                if (data.search) {
                    objectFilter.where = {
                        [Op.or]: [
                            {
                                name: {[Op.like]: `%${data.search}%`}
                            },
                            {
                                id: {[Op.like]: `%${data.search}%`}
                            }
                        ]
                    }
                }
                if (data.censorCode){
                    objectFilter.where = {...objectFilter.where, censorCode: data.censorCode}
                }
                let company = await db.Company.findAndCountAll(objectFilter)
                resolve({
                    errCode: 0,
                    data: company.rows,
                    count: company.count
                })
            }
        } catch (error) {
            reject(error)
        }
    })


}
let handleAddUserCompany = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.phonenumber || !data.companyId) {
                resolve({
                    errCode: 1,
                    errMessage: 'Missing required parameters !'
                })
            } else {
                let company = await db.Company.findOne({ where: { id: data.companyId } })
                if (company) {
                    let isExist = await checkUserPhone(data.phonenumber);
                    if (isExist) {
                        let account = await db.Account.findOne({
                            where: {
                                phonenumber: data.phonenumber
                            },
                            raw: false
                        })
                        if (account.roleCode != 'EMPLOYER') {
                            resolve({
                                errCode: 1,
                                errMessage: 'The account is not an employer'
                            })
                        } else {
                            let user = await db.User.findOne({
                                where: { id: account.userId },
                                attributes: {
                                    exclude: ['userId']
                                },
                                raw: false
                            })
                            if (user.companyId) {
                                resolve({
                                    errCode: 3,
                                    errMessage: 'Employees have company'
                                })
                            }
                            else {
                                user.companyId = data.companyId
                                await user.save()
                                resolve({
                                    errCode: 0,
                                    errMessage: 'Added employee to company'
                                })
                            }
                        }


                    } else {
                        resolve({
                            errCode: 2,
                            errMessage: 'Phone number does not exist!'
                        })
                    }
                }
                else {
                    resolve({
                        errCode: 2,
                        errMessage: 'Company does not exist !'
                    })
                }
            }
        } catch (error) {
            reject(error)
        }
    })
}
let getDetailCompanyByUserId = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.userId && !data.companyId) {
                resolve({
                    errCode: 1,
                    errMessage: 'Missing required parameters !'
                })
            } else {
                let company
                if (data.userId !== 'null') {
                    let user = await db.User.findOne({
                        where: {id: data.userId},
                        attributes: {
                            exclude: ['userId']
                        }
                    })
                    company = await db.Company.findOne({
                        where : {id: user.companyId}
                    })
                }
                else {
                    company = await db.Company.findOne({
                        where: { id: data.companyId }
                    })
                }
                if (!company) {
                    resolve({
                        errCode: 2,
                        errMessage: "Không tìm thấy công ty người dùng sở hữu"
                    })
                }
                else {
                    if (company.file) {
                        company.file = new Buffer(company.file,'base64').toString('binary')
                    }
                    resolve({
                        errCode: 0,
                        data: company,
                    })
                }
            }
        } catch (error) {
            reject(error)
        }
    })
}
let getAllUserByCompanyId = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.limit || !data.offset || !data.companyId) {
                resolve({
                    errCode: 1,
                    errMessage: 'Missing required parameter !'
                })
            } else {

                let res = await db.User.findAndCountAll({
                    where: { companyId: data.companyId },
                    limit: +data.limit,
                    offset: +data.offset,
                    attributes: {
                        exclude: ['password', 'userId']
                    },
                    include: [
                        { model: db.Allcode, as: 'genderData', attributes: ['value', 'code'] },
                        {
                            model: db.Account, as: 'userAccountData', attributes: {
                                exclude: ['password']
                            }, include: [
                                { model: db.Allcode, as: 'roleData', attributes: ['value', 'code'] },
                                { model: db.Allcode, as: 'statusAccountData', attributes: ['value', 'code'] }
                            ]
                        }
                    ],
                    raw: true,
                    nest: true
                })
                resolve({
                    errCode: 0,
                    data: res.rows,
                    count: res.count
                })
            }

        } catch (error) {
            reject(error)
        }
    })
}

let handleQuitCompany = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.userId) {
                resolve({
                    errCode: 1,
                    errMessage: 'Missing required parameters !'
                })
            } else {
                let user = await db.User.findOne({
                    where: {
                        id: data.userId,
                    },
                    attributes: {
                        exclude: ['userId']
                    },
                    raw: false
                })
                if (user) {
                    let account = await db.Account.findOne({
                        where: { userId: user.id },
                        raw: false
                    })
                    if (account.roleCode == 'COMPANY') {
                        account.roleCode = 'EMPLOYER'
                        await account.save()
                    }
                    let company = await db.Company.findOne({
                        where: { id: user.companyId }
                    })
                    await db.Post.update(
                        {
                            userId: company.userId,
                        },
                        {
                            where: { userId: user.id }
                        }
                    )
                    user.companyId = null
                    await user.save()
                    resolve({
                        errCode: 0,
                        errMessage: 'Successfully quit the company'
                    })
                }
                else {
                    resolve({
                        errCode: 2,
                        errMessage: 'User does not exist'
                    })
                }
            }
        } catch (error) {
            reject(error)
        }
    })
}
let getDetailCompanyById = (id) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!id) {
                resolve({
                    errCode: 1,
                    errMessage: 'Missing required parameters !'
                })
            } else {

                let company = await db.Company.findOne({
                    where: { id: id },
                    include: [
                        { model: db.Allcode, as: 'censorData', attributes: ['value', 'code'] },
                    ],
                    nest: true,
                    raw: true
                })
                if (!company) {
                    resolve({
                        errCode: 0,
                        errorMessage: 'Company does not exist',
                    })
                }
                else {
                    resolve({
                        errCode: 0,
                        data: company,
                    })
                }
            }
        } catch (error) {
            reject(error)
        }
    })
}
module.exports = {
    handleCreateNewCompany: handleCreateNewCompany,
    handleUpdateCompany: handleUpdateCompany,
    handleBanCompany: handleBanCompany,
    handleUnBanCompany: handleUnBanCompany,
    handleAccecptCompany: handleAccecptCompany,
    getListCompany: getListCompany,
    getAllCompanyByAdmin: getAllCompanyByAdmin,
    handleAddUserCompany: handleAddUserCompany,
    getDetailCompanyByUserId: getDetailCompanyByUserId,
    getAllUserByCompanyId: getAllUserByCompanyId,
    handleQuitCompany: handleQuitCompany,
    getDetailCompanyById: getDetailCompanyById,

}